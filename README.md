\# Kam App — Login Setup (Email/Password + Google + Facebook)



This connects the Kam app's login screen to a real MySQL database using a small

Node.js/Express API. Email/password signup and login, plus Google and Facebook

sign-in, all work end-to-end. Passwords are hashed with bcrypt and never stored

in plain text; OAuth tokens are always verified server-side, never trusted from

the browser.



\## How the pieces fit together



```

kam-app.html + auth-social.js --fetch--> Express API (server.js) --SQL--> MySQL (kam\_app.users)

&#x20;                                               |

&#x20;                                               +--verify--> Google / Facebook

```



\## Quick start



\### 1. Set up the database



```bash

mysql -u root -p < kam-backend/sql/schema.sql

```



This creates a `kam\_app` database with one `users` table (id, name, email,

password\_hash, oauth\_provider, oauth\_id, created\_at).



\### 2. Configure the backend



```bash

cd kam-backend

cp .env.example .env

```



Open `.env` and fill in:

\- your real MySQL password

\- a random `JWT\_SECRET` (signs login sessions — make it long and random)

\- `GOOGLE\_CLIENT\_ID`, `FACEBOOK\_APP\_ID`, `FACEBOOK\_APP\_SECRET` — see

&#x20; `SETUP\_GOOGLE\_FACEBOOK.md` for how to get these



\### 3. Install dependencies and start the API



```bash

npm install

npm start

```



You should see:

```

Kam API running on http://localhost:4000

```



\### 4. Open the app



Open `kam-app.html` in your browser (or serve it with any static file

server). Make sure the API is running first — the login screen talks to it.



\- \*\*Sign up\*\*: click "Sign up" under the form, fill in name/email/password.

\- \*\*Sign in\*\*: use the same email/password afterward.

\- \*\*Continue with Google / Facebook\*\*: works once you've filled in the

&#x20; client IDs per `SETUP\_GOOGLE\_FACEBOOK.md`. If a Google/Facebook sign-in

&#x20; uses the same email as an existing password account, it links to that

&#x20; account instead of creating a duplicate.

\- The session is kept in `localStorage` (`kam\_token`), so refreshing the page

&#x20; keeps you logged in. "Logout" in the drawer clears it.



\## API endpoints



| Method | Endpoint             | Body                          | Notes                                   |

|--------|----------------------|--------------------------------|------------------------------------------|

| POST   | `/api/signup`         | `{ name, email, password }`   | Creates a user, returns a token           |

| POST   | `/api/login`          | `{ email, password }`         | Verifies password, returns a token        |

| POST   | `/api/auth/google`    | `{ idToken }`                  | Verifies Google ID token, returns a token |

| POST   | `/api/auth/facebook`  | `{ accessToken }`              | Verifies FB access token, returns a token |

| GET    | `/api/me`             | — (needs `Authorization: Bearer <token>`) | Returns the logged-in user |



\## Files



```

kam-app.html                     the app itself (login screen + dashboard)

auth-social.js                   frontend Google/Facebook button wiring

SETUP\_GOOGLE\_FACEBOOK.md         step-by-step provider registration guide

facebook\_login\_example.html      minimal standalone FB login reference snippet

kam-backend/

&#x20; server.js                      Express API — signup/login + OAuth routes

&#x20; oauthProviders.js               verifies Google/Facebook tokens server-side

&#x20; db.js                          MySQL connection pool

&#x20; package.json / package-lock.json

&#x20; .env.example                   copy to .env and fill in real values

&#x20; sql/

&#x20;   schema.sql                   fresh-install schema (includes OAuth columns)

&#x20;   migration\_oauth.sql          run against an existing DB to add OAuth support

```



\## Notes / next steps



\- The worker listings on the dashboard are still randomly generated in the

&#x20; browser (not from the database) — only auth is real for now. Happy to wire

&#x20; up real worker data next if useful.

\- The Apple and Phone Number buttons are disabled placeholders — see

&#x20; "Adding Apple later" in `SETUP\_GOOGLE\_FACEBOOK.md`.

\- For production: serve the HTML over HTTPS, set a strong `JWT\_SECRET`, and

&#x20; consider rate-limiting `/api/login` and the OAuth endpoints to slow down

&#x20; abuse.



