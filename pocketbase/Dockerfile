FROM alpine:3.19

ARG PB_VERSION=0.21.5
RUN apk add --no-cache unzip curl \
    && curl -L -o /tmp/pb.zip https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip /tmp/pb.zip -d /usr/local/bin \
    && rm /tmp/pb.zip

WORKDIR /pb
VOLUME ["/pb/pb_data", "/pb/pb_migrations"]
EXPOSE 8090
CMD ["pocketbase", "serve", "--http=0.0.0.0:8090"]
