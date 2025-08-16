# Vercel Deployment Guide

## ✅ Pre-deployment Checklist

### 1. Build Verification
- [x] TypeScript compilation fixed 
- [x] Client build successful
- [x] Server build successful
- [x] All dependencies installed

### 2. Configuration Files
- [x] `vercel.json` properly configured
- [x] `package.json` start script fixed
- [x] `.vercelignore` excludes unnecessary files
- [x] Environment variables documented

## 🚀 Deployment Steps

### 1. Environment Variables Setup
Configure these environment variables in your Vercel dashboard:

**Required:**
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dyfit
JWT_SECRET=your-strong-jwt-secret-key
FRONTEND_URL=https://your-app.vercel.app
```

**Optional (with defaults):**
```
NODE_ENV=production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
JWT_ALUNO_EXPIRES_IN=7d
JWT_ALUNO_REFRESH_EXPIRES_IN=30d
```

### 2. Build Commands
The build process is configured to run:
1. `npm run build:shared` - Compile shared TypeScript types
2. `npm run build:client` - Build React frontend with Vite
3. `npm run build:server` - Compile TypeScript backend

### 3. File Structure After Build
```
├── client/dist/          # Frontend build output
├── server/dist/          # Backend build output
├── shared/dist/          # Shared types build output
└── vercel.json           # Vercel configuration
```

## 📋 Configuration Details

### vercel.json
- **Frontend**: Static files served from `client/dist`
- **Backend**: Serverless function from `server/index.ts`
- **Routing**: API routes prefixed with `/api/` → backend
- **SPA**: All other routes → `index.html` for React Router

### CORS Configuration
Configured to allow:
- Development: `localhost:5173`, `localhost:4173`
- Production: `FRONTEND_URL` environment variable
- Gitpod/Vercel: `*.gitpod.io`, `*.vercel.app` domains

### Database Connection
- Optimized for serverless with connection caching
- Proper timeout configurations for Vercel limits
- IPv4 preference for better compatibility

## 🔧 Common Issues & Solutions

### 1. Build Failures
- **Issue**: TypeScript compilation errors
- **Solution**: ✅ Fixed variable scope issues in `personalPlanosRoutes.ts`

### 2. Environment Variables
- **Issue**: Missing `MONGODB_URI`, `JWT_SECRET`
- **Solution**: Set in Vercel dashboard → Settings → Environment Variables

### 3. CORS Errors
- **Issue**: Frontend can't connect to API
- **Solution**: Ensure `FRONTEND_URL` matches your Vercel domain

### 4. Database Connection
- **Issue**: MongoDB connection timeouts
- **Solution**: Use MongoDB Atlas with proper network access settings

## 🎯 Post-deployment Verification

1. **Frontend Loading**: Check if the app loads at your Vercel URL
2. **API Health**: Test `/api/auth/health` endpoint  
3. **Database**: Verify MongoDB connection in Vercel function logs
4. **Authentication**: Test login/signup functionality
5. **Plan Management**: Verify the renewal flow works correctly

## 📚 Key Files

- `vercel.json` - Deployment configuration
- `server/index.ts` - Main server entry point
- `server/lib/dbConnect.ts` - Database connection with caching
- `package.json` - Build scripts and dependencies
- `.vercelignore` - Files to exclude from deployment

## 🆘 Troubleshooting

If deployment fails:
1. Check Vercel function logs for errors
2. Verify all environment variables are set
3. Ensure MongoDB Atlas allows Vercel IP ranges (0.0.0.0/0)
4. Test build locally with `npm run build`
5. Check for any missing dependencies

---

*Generated during PR review addressing deployment readiness*