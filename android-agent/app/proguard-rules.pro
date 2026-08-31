# Keep Retrofit & Gson annotations
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }

# Keep SQLCipher native & model classes
-keep class net.sqlcipher.** { *; }
-keep class net.sqlcipher.database.** { *; }
-keep class net.zetetic.** { *; }

# Keep Room database entities
-keep class com.parental.agent.data.local.entity.** { *; }
