import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/review(.*)',
  '/api/upload(.*)',
  '/api/generate(.*)',
  '/api/export(.*)',
  '/api/bullets(.*)',
]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
