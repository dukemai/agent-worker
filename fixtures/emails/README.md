# Email Fixtures

Test data for the Worker's fetch handler and email simulation.

## Format

```json
{
  "subject": "Email subject line",
  "from": "sender@example.com",
  "body": "Plain text or HTML body"
}
```

## Fixtures

| File | Description |
|------|-------------|
| `vklass-utvecklingssamtal.json` | Vklass school notification: development talk times available for booking |
| `xxl-promotion-helmet.json` | XXL promotion: kids helmets on sale (test promotion matching shopping_list) |

## Usage

```bash
# POST fixture to local Worker
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d @fixtures/emails/vklass-utvecklingssamtal.json
```
