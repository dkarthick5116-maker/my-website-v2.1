# My Website V2.1 — Complete Student & Teacher Portal

This single ZIP contains both student and teacher registration/login interfaces, the Supabase database schema, and the two server-side student login functions.

## Login rules

- **Students:** roll number + school name + password. Student login does not ask for an email.
- **Teachers:** email + school name + password. Teacher registration uses email verification.
- Multiple teachers can register using the same school name with their own email accounts.
- A teacher account is associated with the school name entered at registration. This starter version supports one school per teacher account.

## Important before publishing

This is a starter implementation, not a production-ready school information system. Do not use it to store marks, student records, or sensitive information until it has been reviewed and hardened. The Edge Functions need rate limiting, abuse protection, monitoring, and a school-admin verification process before real student use. Email verification proves control of an email address; it does not prove that someone is a teacher.

## Setup overview

1. Create a Supabase project.
2. Open **SQL Editor** in Supabase and run `supabase/schema.sql`.
3. In Supabase project settings, copy the Project URL and the public anon/publishable key.
4. Paste those two public values into `config.js`.
5. Deploy both Edge Functions:
   - `student-signup`
   - `student-login`
6. Set Edge Function secrets in Supabase:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
7. In Supabase Authentication settings, enable email confirmations for teacher accounts and configure the site URL / redirect URL to your deployed Render URL.
8. Upload the contents of this folder to a **new GitHub repository** and create a **separate Render Static Site**. Do not replace the repository or Render service for your existing live website.

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` must only be stored as a Supabase server-side Edge Function secret. Never put it in `config.js`, `index.html`, GitHub, or any browser file.
- `config.js` contains only the public anon/publishable key.
- Student accounts use an internal, non-deliverable email alias generated server-side so students do not need an email address.
- Students currently have no self-service password reset. School administrator support is needed for account recovery.
- The current functions are a prototype and do not yet implement rate limiting or robust abuse prevention.
- The teacher login checks that the entered school name matches the teacher's profile. Teachers can share a school name but each teacher uses their own email/password.

## Render settings for a static site

- Build command: leave blank
- Publish directory: `.`
