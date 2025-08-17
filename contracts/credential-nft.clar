;; LearnSphere Credential NFT Contract
;; Clarity v2 (assuming latest syntax as of 2025)
;; Implements SIP-009 compliant NFT for educational credentials
;; Features: Minting by authorized institutions, metadata updates via oracle,
;; transfer with approvals, revocation by issuer, admin controls, pausing,
;; and event emissions via print.

;; SIP-009 NFT Trait Definition
(define-trait nft-trait
  (
    ;; Required SIP-009 functions
    (get-last-token-id () (response uint uint))
    (get-token-uri (uint) (response (optional (string-ascii 256)) uint))
    (get-owner (uint) (response (optional principal) uint))
    (transfer (uint principal principal) (response bool uint))
  )
)

;; Error Constants
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INSUFFICIENT-PERMISSION u101)
(define-constant ERR-TOKEN-NOT-EXIST u102)
(define-constant ERR-PAUSED u103)
(define-constant ERR-ZERO-ADDRESS u104)
(define-constant ERR-ALREADY-APPROVED u105)
(define-constant ERR-NOT-APPROVED u106)
(define-constant ERR-REVOKED u107)
(define-constant ERR-ORACLE-ONLY u108)
(define-constant ERR-ISSUER-ONLY u109)
(define-constant ERR-MAX-METADATA-LENGTH u110)
(define-constant ERR-INVALID-GRADE u111)

;; Contract Metadata
(define-constant CONTRACT-NAME "LearnSphere Credential NFT")
(define-constant BASE-URI "https://learnsphere.example/metadata/")

;; Admin and State Variables
(define-data-var admin principal tx-sender)
(define-data-var oracle principal tx-sender) ;; Oracle for metadata updates
(define-data-var paused bool false)
(define-data-var last-token-id uint u0)

;; NFT Definition
(define-non-fungible-token credential-nft uint)

;; Maps
(define-map token-issuers uint principal) ;; Issuer of each token
(define-map token-metadata uint {skills: (list 20 (string-ascii 64)), grade: (string-ascii 10), verified-at: uint}) ;; Metadata
(define-map token-revoked uint bool) ;; Revocation status
(define-map approvals {token-id: uint, spender: principal} bool) ;; Approvals for transfer

;; Private Helpers

;; Check if caller is admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Check if caller is oracle
(define-private (is-oracle)
  (is-eq tx-sender (var-get oracle))
)

;; Ensure not paused
(define-private (ensure-not-paused)
  (asserts! (not (var-get paused)) (err ERR-PAUSED))
)

;; Ensure token exists
(define-private (token-exists (token-id uint))
  (is-some (nft-get-owner? credential-nft token-id))
)

;; Ensure not revoked
(define-private (ensure-not-revoked (token-id uint))
  (asserts! (not (default-to false (map-get? token-revoked token-id))) (err ERR-REVOKED))
)

;; Validate grade (e.g., A+, A, B+, etc., max 10 chars, only specific formats)
(define-private (is-valid-grade (grade (string-ascii 10)))
  (or
    (is-eq grade "A+")
    (is-eq grade "A")
    (is-eq grade "A-")
    (is-eq grade "B+")
    (is-eq grade "B")
    (is-eq grade "B-")
    (is-eq grade "C+")
    (is-eq grade "C")
    (is-eq grade "C-")
    (is-eq grade "D")
    (is-eq grade "F")
    (is-eq grade ""))
)

;; Emit event via print (for logging/indexing)
(define-private (emit-event (event-type (string-ascii 32)) (data {token-id: uint, from: principal, to: principal, extra: (optional (string-ascii 256))}))
  (print {event: event-type, token-id: (get token-id data), from: (get from data), to: (get to data), extra: (get extra data)})
)

;; Public Functions

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set admin new-admin)
    (ok true)
  )
)

;; Set oracle
(define-public (set-oracle (new-oracle principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-oracle 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set oracle new-oracle)
    (ok true)
  )
)

;; Pause/unpause contract
(define-public (set-paused (pause bool))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set paused pause)
    (ok pause)
  )
)

;; Mint a new credential NFT
(define-public (mint (recipient principal) (skills (list 20 (string-ascii 64))) (grade (string-ascii 10)))
  (begin
    (ensure-not-paused)
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED)) ;; Extend with allowlist for institutions if needed
    (asserts! (not (is-eq recipient 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (<= (len skills) u20) (err ERR-MAX-METADATA-LENGTH))
    (asserts! (is-valid-grade grade) (err ERR-INVALID-GRADE))
    (let ((new-id (+ (var-get last-token-id) u1)))
      (try! (nft-mint? credential-nft new-id recipient))
      (map-set token-issuers new-id tx-sender)
      (map-set token-metadata new-id {skills: skills, grade: grade, verified-at: block-height})
      (map-set token-revoked new-id false)
      (var-set last-token-id new-id)
      (emit-event "mint" {token-id: new-id, from: tx-sender, to: recipient, extra: none})
      (ok new-id)
    )
  )
)

;; Update metadata via oracle
(define-public (update-metadata (token-id uint) (new-skills (list 20 (string-ascii 64))) (new-grade (string-ascii 10)))
  (begin
    (ensure-not-paused)
    (asserts! (is-oracle) (err ERR-ORACLE-ONLY))
    (asserts! (token-exists token-id) (err ERR-TOKEN-NOT-EXIST))
    (ensure-not-revoked token-id)
    (asserts! (<= (len new-skills) u20) (err ERR-MAX-METADATA-LENGTH))
    (asserts! (is-valid-grade new-grade) (err ERR-INVALID-GRADE))
    (map-set token-metadata token-id {skills: new-skills, grade: new-grade, verified-at: block-height})
    (emit-event "metadata-update" {token-id: token-id, from: tx-sender, to: 'SP000000000000000000002Q6VF78, extra: (some "Updated via oracle")})
    (ok true)
  )
)

;; Revoke credential
(define-public (revoke (token-id uint))
  (begin
    (ensure-not-paused)
    (asserts! (token-exists token-id) (err ERR-TOKEN-NOT-EXIST))
    (asserts! (is-eq tx-sender (default-to 'SP000000000000000000002Q6VF78 (map-get? token-issuers token-id))) (err ERR-ISSUER-ONLY))
    (map-set token-revoked token-id true)
    (emit-event "revoke" {token-id: token-id, from: tx-sender, to: 'SP000000000000000000002Q6VF78, extra: none})
    (ok true)
  )
)

;; Approve spender for transfer
(define-public (approve (token-id uint) (spender principal))
  (begin
    (ensure-not-paused)
    (asserts! (token-exists token-id) (err ERR-TOKEN-NOT-EXIST))
    (ensure-not-revoked token-id)
    (asserts! (is-eq tx-sender (unwrap! (nft-get-owner? credential-nft token-id) (err ERR-TOKEN-NOT-EXIST))) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (default-to false (map-get? approvals {token-id: token-id, spender: spender}))) (err ERR-ALREADY-APPROVED))
    (map-set approvals {token-id: token-id, spender: spender} true)
    (emit-event "approve" {token-id: token-id, from: tx-sender, to: spender, extra: none})
    (ok true)
  )
)

;; Revoke approval
(define-public (revoke-approval (token-id uint) (spender principal))
  (begin
    (ensure-not-paused)
    (asserts! (token-exists token-id) (err ERR-TOKEN-NOT-EXIST))
    (asserts! (is-eq tx-sender (unwrap! (nft-get-owner? credential-nft token-id) (err ERR-TOKEN-NOT-EXIST))) (err ERR-NOT-AUTHORIZED))
    (map-delete approvals {token-id: token-id, spender: spender})
    (emit-event "revoke-approval" {token-id: token-id, from: tx-sender, to: spender, extra: none})
    (ok true)
  )
)

;; Transfer NFT (SIP-009)
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  (begin
    (ensure-not-paused)
    (asserts! (is-eq tx-sender sender) (err ERR-NOT-AUTHORIZED))
    (asserts! (token-exists token-id) (err ERR-TOKEN-NOT-EXIST))
    (ensure-not-revoked token-id)
    (asserts! (not (is-eq recipient 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (or
                (is-eq tx-sender (unwrap! (nft-get-owner? credential-nft token-id) (err ERR-TOKEN-NOT-EXIST)))
                (default-to false (map-get? approvals {token-id: token-id, spender: tx-sender})))
              (err ERR-NOT-APPROVED))
    (try! (nft-transfer? credential-nft token-id sender recipient))
    (map-delete approvals {token-id: token-id, spender: tx-sender}) ;; Clear approval if used
    (emit-event "transfer" {token-id: token-id, from: sender, to: recipient, extra: none})
    (ok true)
  )
)

;; Burn NFT (only by owner or issuer)
(define-public (burn (token-id uint))
  (begin
    (ensure-not-paused)
    (asserts! (token-exists token-id) (err ERR-TOKEN-NOT-EXIST))
    (let ((owner (unwrap! (nft-get-owner? credential-nft token-id) (err ERR-TOKEN-NOT-EXIST)))
          (issuer (default-to 'SP000000000000000000002Q6VF78 (map-get? token-issuers token-id))))
      (asserts! (or (is-eq tx-sender owner) (is-eq tx-sender issuer)) (err ERR-NOT-AUTHORIZED))
      (try! (nft-burn? credential-nft token-id tx-sender))
      (map-delete token-metadata token-id)
      (map-delete token-issuers token-id)
      (map-delete token-revoked token-id)
      (emit-event "burn" {token-id: token-id, from: tx-sender, to: 'SP000000000000000000002Q6VF78, extra: none})
      (ok true)
    )
  )
)

;; Read-only Functions (SIP-009 and extras)

;; Get last token ID (SIP-009)
(define-read-only (get-last-token-id)
  (ok (var-get last-token-id))
)

;; Get token URI (SIP-009) - Construct dynamic URI
(define-read-only (get-token-uri (token-id uint))
  (ok (some (concat BASE-URI (unwrap-panic (to-consensus-buff? token-id)))))
)

;; Get owner (SIP-009)
(define-read-only (get-owner (token-id uint))
  (ok (nft-get-owner? credential-nft token-id))
)

;; Get metadata
(define-read-only (get-metadata (token-id uint))
  (ok (map-get? token-metadata token-id))
)

;; Is revoked
(define-read-only (is-revoked (token-id uint))
  (ok (default-to false (map-get? token-revoked token-id)))
)

;; Get issuer
(define-read-only (get-issuer (token-id uint))
  (ok (map-get? token-issuers token-id))
)

;; Get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Get oracle
(define-read-only (get-oracle)
  (ok (var-get oracle))
)

;; Is paused
(define-read-only (is-paused)
  (ok (var-get paused))
)

;; Check approval
(define-read-only (is-approved (token-id uint) (spender principal))
  (ok (default-to false (map-get? approvals {token-id: token-id, spender: spender})))
)