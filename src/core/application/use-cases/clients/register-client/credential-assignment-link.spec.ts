import { credentialAssignmentLink } from './credential-assignment-link';

describe('credentialAssignmentLink', () => {
    it('points to the portal activation page with the url-encoded token', () => {
        expect(credentialAssignmentLink('http://localhost:3000/portal', 'a+b/c=')).toBe(
            'http://localhost:3000/portal/activate?token=a%2Bb%2Fc%3D',
        );
    });

    it('does not duplicate the slash when PLATFORM_URL ends with one', () => {
        expect(credentialAssignmentLink('https://app.nexlify.com/portal/', 'tok')).toBe(
            'https://app.nexlify.com/portal/activate?token=tok',
        );
    });
});
