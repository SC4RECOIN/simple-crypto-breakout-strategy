# Build React dashboard files
FROM node:14-alpine AS react-builder
WORKDIR /app
COPY ./dashboard .
RUN npm install
RUN npm run build


# Build Golang backend
FROM golang:1.14 AS go-builder
WORKDIR /app
COPY . .
ENV CGO_ENABLED=0
RUN go build main.go


# Copy files from builders
FROM golang:1.14-alpine

WORKDIR /app
COPY --from=react-builder /app/build ./dashboard/build
COPY --from=go-builder /app/main ./
COPY ./config.json .

EXPOSE 4000
ENTRYPOINT ["./main"]
