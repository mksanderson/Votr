# PocketBase Deployment

This directory packages the PocketBase backend separately from the Angular frontend.

## Build and Run with Docker

```bash
docker build -t votr-pocketbase .
docker run -d -p 8090:8090 \
  -v $(pwd)/pb_data:/pb/pb_data \
  -v $(pwd)/pb_migrations:/pb/pb_migrations \
  votr-pocketbase
```

The server exposes port `8090`. Deploy this container to your preferred platform and serve it through HTTPS. Once deployed, update the frontend configuration to point to the hosted URL.
