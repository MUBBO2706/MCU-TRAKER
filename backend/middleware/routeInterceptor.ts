import { Request, Response, NextFunction } from "express";

// Custom Vercel routing adjustment middleware to preserve the original requested subpath
export function vercelRouteInterceptor(req: Request, res: Response, next: NextFunction) {
  const vercelForwardedPath = req.headers["x-vercel-forwarded-path"];
  const forwardedUrl = req.headers["x-forwarded-url"];
  const matchedPath = req.headers["x-matched-path"];
  
  console.log(`[Express API Route Interceptor] method=${req.method} url=${req.url} originalUrl=${req.originalUrl} x-vercel-forwarded-path=${vercelForwardedPath} x-forwarded-url=${forwardedUrl} x-matched-path=${matchedPath}`);

  // 1. If Vercel provided the true original path, always restore it.
  if (vercelForwardedPath && typeof vercelForwardedPath === "string" && vercelForwardedPath.startsWith("/api")) {
    if (req.url !== vercelForwardedPath) {
      console.log(`[Express API Route Interceptor] Restoring req.url to x-vercel-forwarded-path: ${req.url} -> ${vercelForwardedPath}`);
      req.url = vercelForwardedPath;
    }
  } else if (forwardedUrl && typeof forwardedUrl === "string" && forwardedUrl.startsWith("/api")) {
    if (req.url !== forwardedUrl) {
      console.log(`[Express API Route Interceptor] Restoring req.url to x-forwarded-url: ${req.url} -> ${forwardedUrl}`);
      req.url = forwardedUrl;
    }
  } 
  // 2. Fallback: If we are executing as a Vercel serverless function (which only receives /api/* requests)
  // but Vercel stripped the "/api" prefix (e.g. req.url is "/auth/status"), prepend "/api" so Express router matches correctly.
  else {
    const isVercelApiCall = (matchedPath && typeof matchedPath === "string" && matchedPath.includes("/api/index")) || !!process.env.VERCEL;
    if (isVercelApiCall && req.url && !req.url.startsWith("/api") && req.url.startsWith("/")) {
      const reconstructed = `/api${req.url}`;
      console.log(`[Express API Route Interceptor] Reconstructing missing /api prefix for Vercel API function: ${req.url} -> ${reconstructed}`);
      req.url = reconstructed;
    }
  }
  next();
}
