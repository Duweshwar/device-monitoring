import { SetMetadata } from '@nestjs/common';

export const REQUIRE_FEATURE_KEY = 'require_feature_key';

/**
 * Decorator to enforce required plan features on an endpoint.
 * Supports single or multiple feature keys:
 * @example @RequireFeature('stealth_photos')
 * @example @RequireFeature('calls', 'sms')
 */
export const RequireFeature = (...features: string[]) => SetMetadata(REQUIRE_FEATURE_KEY, features);
