# Email Setup for Allio

Allio uses Resend (https://resend.com) to send emails. Free tier: 100 emails/day.

## Quick Setup (5 minutes)

1. Go to https://resend.com and create a free account
2. In the Resend dashboard, go to "API Keys"
3. Click "Create API Key", name it "Allio", copy the key (starts with "re_")
4. In your terminal, inside the allio-app folder, run:
   ```
   npx supabase secrets set RESEND_API_KEY=re_your_key_here
   ```
5. Deploy the email function:
   ```
   npx supabase functions deploy send-email
   ```
6. Test by going to your plan page and clicking "Email my plan"

## Sending from meals@allio.life (optional, recommended)

Until you verify your domain, emails come from onboarding@resend.dev.
To send from meals@allio.life:

1. In Resend dashboard, go to "Domains"
2. Click "Add Domain", enter: allio.life
3. Resend will show you DNS records to add (MX, SPF, DKIM)
4. Add these records in your GoDaddy DNS settings
5. Wait for verification (5-30 minutes)
6. Update the edge function: change 'from' to 'Allio <meals@allio.life>'