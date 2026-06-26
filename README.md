# HelloNode — TEST branch

A minimal **Node.js + Express** HTTPS web application that greets the world and tells you how old it is.

[![CI](https://github.com/richardzembron/HelloNode/actions/workflows/ci.yml/badge.svg)](https://github.com/richardzembron/HelloNode/actions/workflows/ci.yml)
[![Deploy → Test](https://github.com/richardzembron/HelloNode/actions/workflows/deploy-test.yml/badge.svg)](https://github.com/richardzembron/HelloNode/actions/workflows/deploy-test.yml)

---

## Test Environment

| URL | https://hellonodetest.fly.dev |
|---|---|
| Branch | `test` |
| Database | `hellonode_test` on `hellonodetest-db` |

---

## API

### `GET /hello?age=<number>`

**Success — HTTP 200**
```
Hello World. World is 4.543 billion years old
```

**Test environment example**
```bash
curl "https://hellonodetest.fly.dev/hello?age=4.543"
```
