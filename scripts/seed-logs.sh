#!/usr/bin/env bash
API="http://localhost:8080/api/v1/logs"

send() {
  local res
  res=$(curl -s -w "\n%{http_code}" -X POST "$API" -H "Content-Type: application/json" -d "$1")
  local code=$(echo "$res" | tail -1)
  echo "  [$code] $(echo "$1" | grep -o '"message":"[^"]*"' | head -c 80)"
}

echo "=== Sending logs to OpenLog API ==="
echo ""

# api-gateway
send '{"source":"api-gateway","level":"ERROR","message":"Connection timeout after 30s waiting for upstream service response","metadata":{"latency_ms":30012,"upstream":"user-service","endpoint":"/api/v1/users","request_id":"req-a1b2c3"}}'
send '{"source":"api-gateway","level":"ERROR","message":"Rate limit exceeded for client IP 192.168.1.45 - 429 Too Many Requests","metadata":{"client_ip":"192.168.1.45","requests_per_min":312,"limit":100}}'
send '{"source":"api-gateway","level":"FATAL","message":"TLS handshake failed: certificate has expired for upstream payment-service","metadata":{"upstream":"payment-service","cert_expiry":"2026-03-01T00:00:00Z","error_code":"SSL_CERT_EXPIRED"}}'
send '{"source":"api-gateway","level":"WARN","message":"Circuit breaker OPEN for order-service after 5 consecutive failures","metadata":{"service":"order-service","failures":5,"threshold":5,"cooldown_sec":30}}'
send '{"source":"api-gateway","level":"ERROR","message":"Request body too large: 15MB exceeds maximum allowed size of 10MB","metadata":{"content_length":15728640,"max_size":10485760,"endpoint":"/api/v1/uploads"}}'

# user-service
send '{"source":"user-service","level":"ERROR","message":"Deadlock detected in PostgreSQL while updating user profile - retried 3 times","metadata":{"user_id":"usr-8842","table":"users","retries":3}}'
send '{"source":"user-service","level":"WARN","message":"JWT token expired for user session, forcing re-authentication","metadata":{"user_id":"usr-1293","token_age_min":125,"max_age_min":60}}'
send '{"source":"user-service","level":"ERROR","message":"Failed to send verification email via SMTP relay - connection refused","metadata":{"smtp_host":"smtp.internal","port":587,"error":"ECONNREFUSED"}}'
send '{"source":"user-service","level":"INFO","message":"User bulk import completed: 1247 records processed, 3 duplicates skipped","metadata":{"total":1247,"imported":1244,"skipped":3,"duration_ms":8432}}'
send '{"source":"user-service","level":"ERROR","message":"Password hash verification failed - bcrypt cost factor mismatch after migration","metadata":{"expected_cost":12,"actual_cost":10,"user_id":"usr-4410"}}'

# payment-service
send '{"source":"payment-service","level":"FATAL","message":"Stripe webhook signature verification failed - potential replay attack detected","metadata":{"webhook_id":"wh-99281","ip":"203.0.113.42","timestamp_delta_sec":892}}'
send '{"source":"payment-service","level":"ERROR","message":"Double charge detected for order ORD-7821 - initiating automatic refund","metadata":{"order_id":"ORD-7821","amount_cents":4999,"currency":"BRL","charge_count":2}}'
send '{"source":"payment-service","level":"ERROR","message":"PIX payment timeout: QR code expired after 15 minutes without confirmation","metadata":{"payment_id":"pix-33291","amount_cents":15900,"expiry_min":15}}'
send '{"source":"payment-service","level":"WARN","message":"Fraud score above threshold for transaction - flagged for manual review","metadata":{"transaction_id":"txn-8812","fraud_score":0.87,"threshold":0.75,"amount_cents":89900}}'
send '{"source":"payment-service","level":"ERROR","message":"Idempotency key collision detected - rejecting duplicate payment request","metadata":{"idempotency_key":"idem-k8821"}}'

# order-service
send '{"source":"order-service","level":"ERROR","message":"Inventory reservation failed: insufficient stock for SKU-4421 (requested: 5, available: 2)","metadata":{"sku":"SKU-4421","requested":5,"available":2,"warehouse":"WH-SP"}}'
send '{"source":"order-service","level":"ERROR","message":"Order state machine transition error: cannot move from CANCELLED to SHIPPED","metadata":{"order_id":"ORD-1192","from_state":"CANCELLED","to_state":"SHIPPED"}}'
send '{"source":"order-service","level":"WARN","message":"Shipping cost calculation fallback: external API unreachable, using cached rates","metadata":{"carrier":"correios","cache_age_hours":4,"fallback":true}}'
send '{"source":"order-service","level":"FATAL","message":"Database connection pool exhausted: 50/50 connections in use, 23 requests queued","metadata":{"pool_size":50,"active":50,"queued":23,"oldest_conn_sec":312}}'
send '{"source":"order-service","level":"ERROR","message":"Failed to publish OrderCreated event to RabbitMQ - channel closed unexpectedly","metadata":{"exchange":"orders","routing_key":"order.created"}}'

# notification-service
send '{"source":"notification-service","level":"ERROR","message":"Push notification delivery failed: FCM token expired for 342 devices in batch","metadata":{"batch_size":1000,"delivered":658,"expired_tokens":342}}'
send '{"source":"notification-service","level":"WARN","message":"Email template rendering error: missing variable in confirmation template","metadata":{"template":"order_confirmation","user_id":"usr-2291"}}'
send '{"source":"notification-service","level":"ERROR","message":"SMS gateway rate limit: Twilio API returned 429 after sending 500 messages","metadata":{"provider":"twilio","sent":500,"limit_per_min":500,"queue_depth":1200}}'
send '{"source":"notification-service","level":"INFO","message":"Daily notification digest sent successfully to 12847 subscribed users","metadata":{"total_users":12847,"emails_sent":12847,"duration_sec":45}}'
send '{"source":"notification-service","level":"ERROR","message":"WebSocket connection dropped for real-time notification channel - 89 clients disconnected","metadata":{"disconnected_clients":89,"error":"EPIPE","server":"ws-node-03"}}'

# auth-service
send '{"source":"auth-service","level":"ERROR","message":"Brute force attack detected: 47 failed login attempts from single IP in 2 minutes","metadata":{"ip":"45.33.32.156","attempts":47,"window_sec":120,"blocked":true}}'
send '{"source":"auth-service","level":"FATAL","message":"JWKS endpoint unreachable - cannot validate incoming tokens, rejecting all requests","metadata":{"jwks_url":"https://auth.internal/.well-known/jwks.json"}}'
send '{"source":"auth-service","level":"WARN","message":"OAuth2 refresh token rotation detected reuse - possible token theft","metadata":{"user_id":"usr-5521","token_family":"tf-8812","reuse_count":2}}'
send '{"source":"auth-service","level":"ERROR","message":"LDAP sync failed: Active Directory connection timed out after 60 seconds","metadata":{"ldap_host":"ad.corp.internal","timeout_sec":60,"users_pending_sync":234}}'
send '{"source":"auth-service","level":"INFO","message":"Security audit: 23 dormant accounts auto-disabled after 90 days of inactivity","metadata":{"disabled_count":23,"threshold_days":90,"total_checked":8421}}'

# search-service
send '{"source":"search-service","level":"ERROR","message":"Elasticsearch cluster health RED: primary shard unassigned on index products-v2","metadata":{"cluster":"prod-es","index":"products-v2","unassigned_shards":2,"status":"red"}}'
send '{"source":"search-service","level":"WARN","message":"Search query latency p99 above SLO: 2340ms vs target 500ms in last 5 minutes","metadata":{"p99_ms":2340,"slo_ms":500,"window_min":5,"queries":1247}}'
send '{"source":"search-service","level":"ERROR","message":"Index rebuild failed at 67 percent: out of disk space on data node es-data-03","metadata":{"progress_pct":67,"node":"es-data-03","disk_used_pct":98}}'
send '{"source":"search-service","level":"FATAL","message":"Search indexing pipeline crashed: Kafka consumer group rebalance loop detected","metadata":{"consumer_group":"search-indexer","rebalance_count":12,"window_min":5}}'
send '{"source":"search-service","level":"DEBUG","message":"Cache hit ratio for search queries: 73.2 percent over last hour, below 80 percent target","metadata":{"hit_ratio":0.732,"target":0.80,"total_queries":8932}}'

# k8s-controller
send '{"source":"k8s-controller","level":"ERROR","message":"Pod payment-service-7b8d4f OOMKilled: container exceeded 512Mi memory limit","metadata":{"pod":"payment-service-7b8d4f-x2k9q","limit":"512Mi","peak":"547Mi","namespace":"production"}}'
send '{"source":"k8s-controller","level":"WARN","message":"HPA scaling limit reached: order-service at max 10 replicas, CPU still at 89 percent","metadata":{"deployment":"order-service","replicas":10,"max_replicas":10,"cpu_pct":89}}'
send '{"source":"k8s-controller","level":"FATAL","message":"etcd cluster lost quorum: 2 of 3 members unreachable, cluster is read-only","metadata":{"healthy_members":1,"total_members":3,"leader":"etcd-01"}}'
send '{"source":"k8s-controller","level":"ERROR","message":"PersistentVolumeClaim stuck in Pending: no available PV matches the claim requirements","metadata":{"pvc":"data-postgres-0","storage_class":"gp3","requested":"100Gi"}}'
send '{"source":"k8s-controller","level":"WARN","message":"Certificate renewal warning: ingress TLS cert expires in 7 days for openlog.dev","metadata":{"domain":"openlog.dev","expiry":"2026-03-15T00:00:00Z","issuer":"letsencrypt"}}'

echo ""
echo "=== Done! 40 logs sent ==="
