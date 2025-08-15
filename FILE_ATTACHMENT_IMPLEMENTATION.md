# File Attachment System Implementation Guide

## Overview
This document describes the implementation of the new file attachment system that fixes mobile display issues and admin download problems in the renewal request system.

## Issues Fixed

### 1. Invalid `file://` URLs 
**Problem**: Backend was storing invalid `file://` protocol URLs causing browser errors.
**Solution**: Now stores proper HTTPS URLs from Vercel Blob, with `legacy-file:` prefix for backward compatibility.

### 2. Admin Download 401 Errors
**Problem**: Direct `<a href>` links to protected endpoints didn't include JWT headers.
**Solution**: Replaced with Button handlers that use signed URLs or authenticated requests.

### 3. Mobile UI Not Updating
**Problem**: Mobile devices didn't show "attached" status after successful uploads.
**Solution**: Enhanced React Query invalidation with forced refetch and input refs for re-rendering.

## Technical Implementation

### Backend Changes

#### New Endpoints
- `POST /api/personal/renewal-requests/:id/proof/presign` - Generate presigned upload URL
- `POST /api/personal/renewal-requests/:id/proof/confirm` - Confirm successful upload
- `GET /api/files/sign?proofId=...` - Generate signed download URLs

#### File Routes (`server/src/routes/fileRoutes.ts`)
Handles signed download URL generation with proper authentication and backward compatibility for legacy GridFS files.

#### Enhanced Personal Renewal Routes
- Two-step upload process with Vercel Blob integration
- Mock functionality for development without Vercel Blob
- Fixed invalid URL storage (no more `file://` URLs)

### Frontend Changes

#### Enhanced API Client (`client/src/lib/apiClient.ts`)
- `uploadFileWithPresignedUrl()` - Two-step upload workflow
- `downloadFile()` - Handles both legacy and new file downloads
- `getSignedDownloadUrl()` - Gets signed URLs for downloads

#### Mobile-Safe Upload (`client/src/pages/solicitar-renovacao.tsx`)
- Input refs for forced re-rendering on iOS/Android
- Enhanced React Query invalidation with `refetchQueries`
- Improved file validation with clear error messages
- Better error handling and user feedback

#### Admin Interface (`client/src/pages/admin/renewal-requests.tsx`)
- Button handlers instead of direct `<a href>` links
- Smart detection of HTTPS URLs vs legacy files
- Proper error handling for download failures

## Environment Configuration

### Required Environment Variables

#### Production (Vercel)
```bash
# Get this token from Vercel dashboard: https://vercel.com/dashboard/blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

#### Development (Optional)
If `BLOB_READ_WRITE_TOKEN` is not set, the system will use mock responses for testing.

## Testing Guide

### 1. Mobile Upload Testing
1. Open renewal request page on mobile device
2. Select file and upload
3. Verify "1 arquivo anexado" appears immediately
4. Check browser console for no `file://` errors

### 2. Admin Download Testing
1. Login as admin
2. Navigate to renewal requests
3. Click "Baixar" button on file attachments
4. Verify no 401 errors occur
5. File should download successfully

### 3. File Validation Testing
1. Try uploading files > 5MB (should show error)
2. Try uploading non-PDF/JPG/PNG files (should show error)
3. Verify error messages are clear and helpful

### 4. Backward Compatibility Testing
1. Test downloading existing files uploaded before this implementation
2. Verify legacy GridFS files still work
3. Check that new uploads use Vercel Blob storage

## File Size and Type Limits

- **Maximum file size**: 5MB (reduced from 10MB as per requirements)
- **Allowed types**: PDF, JPEG, PNG only
- **Upload method**: Two-step process (presign → direct to Vercel Blob → confirm)

## Error Handling

### Network Errors
- Network failures don't trigger automatic logout
- Clear error messages for user guidance
- Graceful fallback to legacy upload if Vercel Blob fails

### Validation Errors
- File size validation with specific error messages
- File type validation with allowed types list
- Input clearing on validation failures (mobile-safe)

## Deployment Notes

### Vercel Configuration
1. Add `BLOB_READ_WRITE_TOKEN` to Vercel environment variables
2. Ensure the token has read/write permissions
3. Verify the token is available in the runtime environment

### Database Migration
No database migration is required. The system maintains backward compatibility:
- Old files: Keep existing `paymentProofUrl` with legacy prefixes
- New files: Store HTTPS URLs from Vercel Blob
- Download logic: Automatically detects and handles both types

## Performance Considerations

### Upload Performance
- Direct upload to Vercel Blob (doesn't go through server)
- Reduced server load and faster uploads
- Better scalability for large files

### Download Performance
- New files: Direct HTTPS URLs (no server proxy)
- Legacy files: Server-proxied downloads with JWT auth
- Cached signed URLs where possible

## Security

### Upload Security
- File type validation on both client and server
- File size limits enforced
- Presigned URLs expire after use

### Download Security
- JWT authentication for legacy files
- Signed URLs for new files
- Access control based on user permissions

## Monitoring and Logging

### Server Logs
- Upload process logging with prefixes: `[Presign]`, `[Confirm]`
- Download attempt logging
- Error logging for debugging

### Client Logs
- Upload workflow logging with prefix: `[Upload]`
- Download attempt logging
- React Query invalidation logging

## Common Issues and Solutions

### Issue: Vercel Blob not configured
**Solution**: System falls back to mock mode for development

### Issue: File upload fails on mobile
**Solution**: Check input refs are properly clearing on errors

### Issue: Admin can't download files
**Solution**: Verify signed URL generation and Button click handlers

### Issue: UI doesn't update after upload
**Solution**: Check React Query invalidation and refetch calls

## Support

For issues related to this implementation:
1. Check browser console for error messages
2. Verify environment variables are set correctly
3. Test with mock mode for development issues
4. Check server logs for upload/download failures