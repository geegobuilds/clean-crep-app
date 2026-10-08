import { Linking } from 'react-native';

// The privacy policy and terms live on the website so there is one copy.
// App Store and Google Play both require the policy to be reachable in-app.
export const PRIVACY_URL = 'https://www.cleancrep.com/privacy';
export const TERMS_URL = 'https://www.cleancrep.com/terms';

export const openPrivacy = () => Linking.openURL(PRIVACY_URL);
export const openTerms = () => Linking.openURL(TERMS_URL);
