# QuizFrontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.30.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Registration API

The sign-up form calls `POST /api/auth/register`. The request uses `email`, `password` and `displayName`; password confirmation stays in the frontend.

For local development, configure the root `.env` from `.env.example`, then start the backend from the repository root:

```bash
docker compose up -d --build bff
```

The Angular development server forwards `/api` requests to `http://127.0.0.1:3001` using `src/proxy.conf.json`. Restart the development server after changing this file.

For a production deployment, route `/api` to the BFF on the same origin as the frontend.

## Authentication

Sign in calls `POST /api/auth/login`, then opens `/account`. The account page checks `GET /api/me` before showing the success message and user role. Password reset is still frontend-only.

The session is kept in browser sessionStorage for the current tab. A page reload restores it and verifies it through the BFF. Tokens are returned in JSON by the current backend contract, rather than HttpOnly cookies.

The HTTP interceptor sends the access token only to relative `/api/` routes. It refreshes an expiring token, shares concurrent refresh requests and retries a 401 response once. Refresh replaces both tokens. Logout calls `POST /api/auth/logout` and clears the local session even if the server cannot be reached.

The root local `.env` needs `IDENTITY_JWT_SECRET` (at least 32 characters), `IDENTITY_JWT_EXPIRATION_MINUTES` and `IDENTITY_REFRESH_TOKEN_EXPIRATION_DAYS`. Identity and BFF use the same secret through Docker Compose. The secret stays on the backend.

See the [BFF contract](../services/bff/CONTRACT.md) for request and response details.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
