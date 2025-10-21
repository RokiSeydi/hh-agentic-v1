# Backend-only repository

This repository has been pruned to contain only the backend app. The frontend and other files were removed per your request.

Current backend tree:

```
holding-health/
   backend/
      server.js
      package.json
      .env (add your API key here)
```

How to run

```bash
cd backend
npm install
npm start
```

Server will run on the port set in `backend/.env` (default: 3001).

If you want the frontend restored later, I can recreate it or convert this to a mono-repo again.
