---
sidebar_position: 3
---

# gRPC Contracts Specification

This document contains the Protocol Buffer definitions for all core UPF interfaces.

## Proto File Organization

```
packages/core/proto/
├── interfaces/
│   ├── auth.proto
│   ├── storage.proto
│   ├── cache.proto
│   ├── files.proto
│   └── message_bus.proto
├── registry/
│   └── registry.proto
├── common/
│   ├── types.proto
│   └── errors.proto
└── health/
    └── health.proto
```

## IAuth Service

```protobuf
// proto/interfaces/auth.proto
syntax = "proto3";

package upf.interfaces.auth;

import "google/protobuf/timestamp.proto";
import "common/types.proto";

service IAuth {
  rpc ValidateToken(ValidateTokenRequest) returns (TokenValidation);
  rpc GetUserInfo(GetUserInfoRequest) returns (UserInfo);
  rpc RefreshToken(RefreshTokenRequest) returns (TokenResponse);
  rpc Logout(LogoutRequest) returns (LogoutResponse);
  rpc GetPermissions(GetPermissionsRequest) returns (PermissionsResponse);
  rpc CheckPermission(CheckPermissionRequest) returns (CheckPermissionResponse);
}

message ValidateTokenRequest {
  string token = 1;
}

message TokenValidation {
  bool valid = 1;
  string user_id = 2;
  string email = 3;
  repeated string roles = 4;
  repeated string permissions = 5;
  int64 expires_at = 6;
}

message GetUserInfoRequest {
  string user_id = 1;
}

message UserInfo {
  string id = 1;
  string email = 2;
  string display_name = 3;
  string avatar_url = 4;
  repeated string roles = 5;
  map<string, string> metadata = 6;
  google.protobuf.Timestamp created_at = 7;
  google.protobuf.Timestamp updated_at = 8;
}

message RefreshTokenRequest {
  string refresh_token = 1;
}

message TokenResponse {
  string access_token = 1;
  string refresh_token = 2;
  int32 expires_in = 3;
  string token_type = 4;
}

message LogoutRequest {
  string token = 1;
}

message LogoutResponse {
  bool success = 1;
}

message GetPermissionsRequest {
  string user_id = 1;
}

message Permission {
  string resource = 1;
  string action = 2;
  map<string, string> conditions = 3;
}

message PermissionsResponse {
  repeated Permission permissions = 1;
}

message CheckPermissionRequest {
  string user_id = 1;
  string permission = 2;
  map<string, string> context = 3;
}

message CheckPermissionResponse {
  bool allowed = 1;
  string reason = 2;
}
```

## IStorage Service

```protobuf
// proto/interfaces/storage.proto
syntax = "proto3";

package upf.interfaces.storage;

import "google/protobuf/struct.proto";
import "google/protobuf/any.proto";

service IStorage {
  // CRUD operations
  rpc Get(GetRequest) returns (GetResponse);
  rpc Set(SetRequest) returns (SetResponse);
  rpc Delete(DeleteRequest) returns (DeleteResponse);
  rpc Exists(ExistsRequest) returns (ExistsResponse);

  // Batch operations
  rpc BatchGet(BatchGetRequest) returns (BatchGetResponse);
  rpc BatchSet(BatchSetRequest) returns (BatchSetResponse);
  rpc BatchDelete(BatchDeleteRequest) returns (BatchDeleteResponse);

  // Query operations
  rpc Query(QueryRequest) returns (QueryResponse);
  rpc Count(CountRequest) returns (CountResponse);

  // Streaming operations
  rpc StreamQuery(QueryRequest) returns (stream Record);
  rpc StreamSet(stream SetRequest) returns (StreamSetResponse);
}

message GetRequest {
  string collection = 1;
  string id = 2;
}

message GetResponse {
  bool found = 1;
  bytes data = 2;
}

message SetRequest {
  string collection = 1;
  string id = 2;
  bytes data = 3;
}

message SetResponse {
  bool success = 1;
  string id = 2;
}

message DeleteRequest {
  string collection = 1;
  string id = 2;
}

message DeleteResponse {
  bool deleted = 1;
}

message ExistsRequest {
  string collection = 1;
  string id = 2;
}

message ExistsResponse {
  bool exists = 1;
}

message BatchGetRequest {
  string collection = 1;
  repeated string ids = 2;
}

message BatchGetResponse {
  map<string, bytes> items = 1;
}

message BatchSetRequest {
  string collection = 1;
  map<string, bytes> items = 2;
}

message BatchSetResponse {
  int32 count = 1;
}

message BatchDeleteRequest {
  string collection = 1;
  repeated string ids = 2;
}

message BatchDeleteResponse {
  int32 deleted_count = 1;
}

message QueryRequest {
  string collection = 1;
  repeated WhereClause where = 2;
  repeated OrderByClause order_by = 3;
  int32 limit = 4;
  int32 offset = 5;
  repeated string select = 6;
}

message WhereClause {
  string field = 1;
  Operator operator = 2;
  google.protobuf.Value value = 3;
}

enum Operator {
  OPERATOR_UNSPECIFIED = 0;
  OPERATOR_EQ = 1;
  OPERATOR_NE = 2;
  OPERATOR_GT = 3;
  OPERATOR_GTE = 4;
  OPERATOR_LT = 5;
  OPERATOR_LTE = 6;
  OPERATOR_IN = 7;
  OPERATOR_CONTAINS = 8;
  OPERATOR_STARTS_WITH = 9;
}

message OrderByClause {
  string field = 1;
  Direction direction = 2;
}

enum Direction {
  DIRECTION_UNSPECIFIED = 0;
  DIRECTION_ASC = 1;
  DIRECTION_DESC = 2;
}

message QueryResponse {
  repeated Record items = 1;
  int64 total = 2;
  bool has_more = 3;
  string cursor = 4;
}

message Record {
  string id = 1;
  bytes data = 2;
}

message CountRequest {
  string collection = 1;
  repeated WhereClause where = 2;
}

message CountResponse {
  int64 count = 1;
}

message StreamSetResponse {
  int32 count = 1;
}
```

## ICache Service

```protobuf
// proto/interfaces/cache.proto
syntax = "proto3";

package upf.interfaces.cache;

service ICache {
  rpc Get(CacheGetRequest) returns (CacheGetResponse);
  rpc Set(CacheSetRequest) returns (CacheSetResponse);
  rpc Delete(CacheDeleteRequest) returns (CacheDeleteResponse);
  rpc MGet(MGetRequest) returns (MGetResponse);
  rpc MSet(MSetRequest) returns (MSetResponse);
  rpc Invalidate(InvalidateRequest) returns (InvalidateResponse);
  rpc Subscribe(SubscribeRequest) returns (stream CacheEvent);
  rpc Publish(PublishRequest) returns (PublishResponse);
}

message CacheGetRequest {
  string key = 1;
}

message CacheGetResponse {
  bool found = 1;
  bytes value = 2;
}

message CacheSetRequest {
  string key = 1;
  bytes value = 2;
  int32 ttl_seconds = 3;
  bool nx = 4;
  bool xx = 5;
}

message CacheSetResponse {
  bool success = 1;
}

message CacheDeleteRequest {
  string key = 1;
}

message CacheDeleteResponse {
  bool deleted = 1;
}

message MGetRequest {
  repeated string keys = 1;
}

message MGetResponse {
  map<string, bytes> values = 1;
}

message MSetRequest {
  map<string, bytes> values = 1;
  int32 ttl_seconds = 2;
}

message MSetResponse {
  bool success = 1;
}

message InvalidateRequest {
  string pattern = 1;
}

message InvalidateResponse {
  int32 invalidated_count = 1;
}

message SubscribeRequest {
  string channel = 1;
}

message CacheEvent {
  string channel = 1;
  bytes message = 2;
  int64 timestamp = 3;
}

message PublishRequest {
  string channel = 1;
  bytes message = 2;
}

message PublishResponse {
  int32 receivers = 1;
}
```

## IFiles Service

```protobuf
// proto/interfaces/files.proto
syntax = "proto3";

package upf.interfaces.files;

import "google/protobuf/timestamp.proto";

service IFiles {
  rpc Upload(stream FileChunk) returns (UploadResponse);
  rpc Download(DownloadRequest) returns (stream FileChunk);
  rpc GetMetadata(GetMetadataRequest) returns (FileMetadata);
  rpc Delete(FileDeleteRequest) returns (FileDeleteResponse);
  rpc List(ListRequest) returns (stream FileMetadata);
  rpc GetSignedUrl(SignedUrlRequest) returns (SignedUrlResponse);
}

message FileChunk {
  string path = 1;
  bytes data = 2;
  int64 offset = 3;
  bool final = 4;
  FileOptions options = 5;
}

message FileOptions {
  string content_type = 1;
  map<string, string> metadata = 2;
  string acl = 3;
}

message UploadResponse {
  FileMetadata metadata = 1;
}

message DownloadRequest {
  string path = 1;
  int64 offset = 2;
  int64 length = 3;
}

message GetMetadataRequest {
  string path = 1;
}

message FileMetadata {
  string path = 1;
  int64 size = 2;
  string content_type = 3;
  string etag = 4;
  google.protobuf.Timestamp last_modified = 5;
  map<string, string> metadata = 6;
}

message FileDeleteRequest {
  string path = 1;
}

message FileDeleteResponse {
  bool deleted = 1;
}

message ListRequest {
  string prefix = 1;
  int32 limit = 2;
  string cursor = 3;
  string delimiter = 4;
}

message SignedUrlRequest {
  string path = 1;
  Operation operation = 2;
  int32 expires_in_seconds = 3;
}

enum Operation {
  OPERATION_UNSPECIFIED = 0;
  OPERATION_READ = 1;
  OPERATION_WRITE = 2;
}

message SignedUrlResponse {
  string url = 1;
  google.protobuf.Timestamp expires_at = 2;
}
```

## IMessageBus Service

```protobuf
// proto/interfaces/message_bus.proto
syntax = "proto3";

package upf.interfaces.messagebus;

import "google/protobuf/timestamp.proto";

service IMessageBus {
  rpc Publish(PublishRequest) returns (PublishResponse);
  rpc Subscribe(SubscribeRequest) returns (stream Message);
  rpc Request(RequestMessage) returns (Message);
  rpc Ack(AckRequest) returns (AckResponse);
  rpc Nak(NakRequest) returns (NakResponse);
}

message Message {
  string id = 1;
  string topic = 2;
  bytes data = 3;
  map<string, string> headers = 4;
  google.protobuf.Timestamp timestamp = 5;
  string reply_to = 6;
}

message PublishRequest {
  string topic = 1;
  bytes data = 2;
  map<string, string> headers = 3;
}

message PublishResponse {
  string message_id = 1;
}

message SubscribeRequest {
  string topic = 1;
  string queue = 2;
  StartPosition start_from = 3;
  AckPolicy ack_policy = 4;
}

enum StartPosition {
  START_POSITION_UNSPECIFIED = 0;
  START_POSITION_BEGINNING = 1;
  START_POSITION_LATEST = 2;
}

enum AckPolicy {
  ACK_POLICY_UNSPECIFIED = 0;
  ACK_POLICY_EXPLICIT = 1;
  ACK_POLICY_AUTO = 2;
}

message RequestMessage {
  string topic = 1;
  bytes data = 2;
  map<string, string> headers = 3;
  int32 timeout_ms = 4;
}

message AckRequest {
  string message_id = 1;
}

message AckResponse {
  bool success = 1;
}

message NakRequest {
  string message_id = 1;
  int32 delay_seconds = 2;
}

message NakResponse {
  bool success = 1;
}
```

## Health Check Service

```protobuf
// proto/health/health.proto
syntax = "proto3";

package grpc.health.v1;

service Health {
  rpc Check(HealthCheckRequest) returns (HealthCheckResponse);
  rpc Watch(HealthCheckRequest) returns (stream HealthCheckResponse);
}

message HealthCheckRequest {
  string service = 1;
}

message HealthCheckResponse {
  enum ServingStatus {
    UNKNOWN = 0;
    SERVING = 1;
    NOT_SERVING = 2;
    SERVICE_UNKNOWN = 3;
  }
  ServingStatus status = 1;
}
```

## Code Generation

### TypeScript (using protobuf-ts)

```bash
npx protoc --ts_out=./src/generated \
  --ts_opt=long_type_string \
  --ts_opt=generate_dependencies \
  --proto_path=./proto \
  ./proto/**/*.proto
```

### Bun/Node.js

```bash
npx grpc_tools_node_protoc \
  --js_out=import_style=commonjs,binary:./src/generated \
  --grpc_out=grpc_js:./src/generated \
  --proto_path=./proto \
  ./proto/**/*.proto
```

## Related Documentation

- [Interfaces](./interfaces.md) - TypeScript interface definitions
- [Communication](../architecture/communication.md) - gRPC patterns

---

**Previous**: [Interfaces](./interfaces.md)
**Next**: [UI Contracts](./ui-contracts.md)
