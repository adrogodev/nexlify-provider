export const DKIM_KEY_GENERATOR = Symbol('IDkimKeyGenerator');

export interface DkimKeyPair {
    /** Base64 DER (SPKI) public key, ready for the `p=` tag of the DKIM TXT record. */
    publicKey: string;
    /** PKCS#8 PEM private key (plaintext: encrypt before persisting). */
    privateKeyPem: string;
}

export interface IDkimKeyGenerator {
    /** RSA-2048 keypair for DKIM signing. */
    generate(): DkimKeyPair;
}
