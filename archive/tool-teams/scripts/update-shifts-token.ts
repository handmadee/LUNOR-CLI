/**
 * Update Shifts Token Script
 * Updates the database with a new Shifts API token
 */
import 'dotenv/config';
import { credentialsRepository } from '../src/modules/auth/repositories/credentials.repository';
import { encryptionUtil } from '../src/shared/utils/encryption.util';

// The CORRECT Shifts API token (aud: https://api.manage.staffhub.office.com)
const SHIFTS_TOKEN = `eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IlBjWDk4R1g0MjBUMVg2c0JEa3poUW1xZ3dNVSIsImtpZCI6IlBjWDk4R1g0MjBUMVg2c0JEa3poUW1xZ3dNVSJ9.eyJhdWQiOiJodHRwczovL2FwaS5tYW5hZ2Uuc3RhZmZodWIub2ZmaWNlLmNvbSIsImlzcyI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0LzBiNTc2NjcwLWE0MjktNGJhZi05NGE2LTQ2MjEzMmVhZTAxNi8iLCJpYXQiOjE3Njg3MTc1NzksIm5iZiI6MTc2ODcxNzU3OSwiZXhwIjoxNzY4NzIyMjI4LCJhY3IiOiIxIiwiYWlvIjoiQVVRQXUvOGJBQUFBN1pGRXNweHN4WmJ2aWJNYzBoTUFnWXkvTGtiZWJybjh1SDhXTzRjTkxWR2ZVWkxEMk9oNWdOSUhCY1RsTitaelREK2NsOVlZQ3JyKzhlUU52b0xXT0E9PSIsImFtciI6WyJwd2QiXSwiYXBwaWQiOiJhYTU4MDYxMi1jMzQyLTRhY2UtOTA1NS04ZWRlZTQzY2NiODkiLCJhcHBpZGFjciI6IjAiLCJmYW1pbHlfbmFtZSI6IlBoYW0gWHVhbiIsImdpdmVuX25hbWUiOiJEYXQiLCJpZHR5cCI6InVzZXIiLCJpcGFkZHIiOiIxMTguNzEuMTg3LjEzMSIsIm5hbWUiOiJQaOG6oW0gWHXDom4gxJDhuqF0Iiwib2lkIjoiYThiODgxMmUtYzM0MS00YWJmLTkyODItMDI4MmJjMDczMWFiIiwicHVpZCI6IjEwMDMyMDA0NERGMkNGQjEiLCJyaCI6IjEuQWI0QWNHWlhDeW1rcjB1VXBrWWhNdXJnRmhJR1dLcEN3ODVLa0ZXTzN1UTh5NG0tQU1DLUFBLiIsInNjcCI6Ik1lbWJlci5SZWFkV3JpdGUuQWxsIFNoaWZ0LlJlYWRXcml0ZS5BbGwgVGVhbS5SZWFkV3JpdGUuQWxsIFVzZXIuUmVhZC5BbGwgVXNlci5SZWFkV3JpdGUuQWxsIFdlYkhvb2suUmVhZFdyaXRlLkFsbCIsInNpZCI6IjAwMTFlMjNhLWQzOTItNjM0My0wOGI4LWM3YTNkZjhmODE1YiIsInN1YiI6Imp3aXJ2RUpvQ241Z0QzZU9UZEpYN1dBb1NTUzdUYmQ3Y2R4M1lwWjFWbDQiLCJ0aWQiOiIwYjU3NjY3MC1hNDI5LTRiYWYtOTRhNi00NjIxMzJlYWUwMTYiLCJ1bmlxdWVfbmFtZSI6ImRhdHB4QGhpbGFiLmFzaWEiLCJ1cG4iOiJkYXRweEBoaWxhYi5hc2lhIiwidXRpIjoiQnF2VVA3MmZYa2l2WWdvTXlEeHRBQSIsInZlciI6IjEuMCIsInhtc19hY3RfZmN0IjoiMyA1IiwieG1zX2Z0ZCI6IkNDYWJaYVk1QkEtSjd3eUdDRXBvcGdrcFh6WUxYU2c1OFY2TjF0b0d1QVlCYTI5eVpXRmpaVzUwY21Gc0xXUnpiWE0iLCJ4bXNfaWRyZWwiOiIxNCAxIiwieG1zX3N1Yl9mY3QiOiIzIDEyIn0.Jnv5IWT0d-qMDzE7U9yUkes5vNK3MyAEqjbrwd-GVbIaDskziC7Ik6Zh7PHR2jZ0R72lOdaRu4j96cf6PN9LCO60HKbuVS0TnQRVKmGa9AU-aixUzVq8ihH8o1tag9wROZGx-i9iObKeqP24pX9s6e1poaU0I77TZImIq9IcY9DwEquR2CJab5-9iOUVESCzZTsON0g43LCYD52uAaGZHbNCr6bRDsq3lCRfzvOGhNI_Rp1MgKK9B5x5BBThX11EVzKN9sy-yP7mfwYtELWzX9OohnWBokWx27dOfrF9olrZzTcHZGHFtGR3S9Rr9mQDn4nM_FcFajMIgGr257A2Xg`;

async function main() {
  console.log('🔄 Updating Shifts token...');
  
  const encrypted = encryptionUtil.encrypt(SHIFTS_TOKEN);
  
  // Update both users
  ['default', 'datpx@hilab.asia'].forEach(userId => {
    const existing = credentialsRepository.findById(userId);
    if (existing) {
      credentialsRepository.save({
        userId,
        teamId: existing.team_id || 'TEAM_f3734c17-10b6-46c0-819e-8aa413cb5753',
        accessToken: encrypted,
        deviceId: existing.device_id || undefined,
        sessionId: existing.session_id || undefined,
      });
      console.log(`✅ Updated ${userId}`);
    }
  });
  
  console.log('🎉 Done! Restart the server and try /clockin');
}

main().catch(console.error);
