# Postman API Documentation

This file is a quick Postman guide for the API in this project.

## Route Groups

- [Authentication and Users](#authentication-and-users)
- [Categories](#categories)
- [Statuses](#statuses)
- [Occurrences](#occurrences)
- [Comments](#comments)
- [Extra Error Tests](#extra-error-tests-for-postman)

## Base Setup

- Base URL: `http://<HOST>:<PORT>`
- Common header for protected routes:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`

## Authentication Flow

1. Register a user with `POST /users`
2. Login with `POST /users/login`
3. Copy the returned `token`
4. Use `Authorization: Bearer <token>` on protected routes

## Authentication and Users

#### `POST /users`
Register a new user.

Body (`application/json`):

```json
{
  "user_name": "Joao Silva",
  "email": "joao@esmad.ipp.pt",
  "password": "123456",
  "profile_type": "estudante"
}
```

Accepted `profile_type` values in the API:
- `admin`
- `funcionario`
- `estudante`
- `docente`

Notes:
- `estudante` and `docente` are converted internally to `student_teacher`
- Institutional email is required for `estudante` and `docente`

Common errors to test:
- Missing field(s) -> `400`
- Invalid profile type -> `400`
- Non-institutional email for student/teacher -> `400`
- Duplicate email -> `409`

#### `POST /users/login`
Login and receive a JWT token.

Body (`application/json`):

```json
{
  "email": "joao@esmad.ipp.pt",
  "password": "123456"
}
```

Common errors to test:
- Missing email/password -> `400`
- Wrong credentials -> `401`
- Suspended account -> `403`

#### `PATCH /users/:user_id`
Update a user profile.

Body (`application/json`):

```json
{
  "user_name": "Joao Silva Updated",
  "email": "joao.updated@esmad.ipp.pt",
  "state": "suspended"
}
```

Notes:
- Non-admin users can only update their own profile
- `state` is only applied when the logged user is an admin

Common errors to test:
- Missing/invalid token -> `401` or `403`
- Editing another user as a normal user -> `403`
- User not found -> `404`

#### `DELETE /users/:user_id`
Delete a user.

No body required.

Notes:
- Only admin can delete users
- Admin cannot delete their own account

Common errors to test:
- Missing token -> `401`
- Non-admin token -> `403`
- User not found -> `404`
- Trying to delete yourself as admin -> `400`

---

## Categories

#### `POST /categories`
Create a category.

Headers:
- `Authorization: Bearer <JWT_TOKEN>`

Body (`application/json`):

```json
{
  "category_name": "Electricidade"
}
```

Notes:
- Admin only

Common errors to test:
- Missing token -> `401`
- Non-admin token -> `403`
- Empty name -> `400`
- Duplicate category -> `409`

#### `PUT /categories/:category_id`
Update a category.

Body (`application/json`):

```json
{
  "category_name": "Informática"
}
```

Common errors to test:
- Missing token -> `401`
- Non-admin token -> `403`
- Category not found -> `404`
- Duplicate name -> `409`

#### `DELETE /categories/:category_id`
Delete a category.

No body required.

Common errors to test:
- Missing token -> `401`
- Non-admin token -> `403`
- Category not found -> `404`
- Category in use by occurrences -> `500`

---

## Statuses

#### `POST /status`
Create a status.

Body (`application/json`):

```json
{
  "status_name": "Em análise"
}
```

Notes:
- Admin only

Common errors to test:
- Missing token -> `401`
- Non-admin token -> `403`
- Empty name -> `400`
- Duplicate status -> `409`

#### `PUT /status/:status_id`
Update a status.

Body (`application/json`):

```json
{
  "status_name": "Resolvida"
}
```

Common errors to test:
- Missing token -> `401`
- Non-admin token -> `403`
- Status not found -> `404`
- Duplicate name -> `409`

#### `DELETE /status/:status_id`
Delete a status.

No body required.

Common errors to test:
- Missing token -> `401`
- Non-admin token -> `403`
- Status not found -> `404`
- Status still linked to occurrences/history -> `500`

---

## Occurrences

#### `POST /occurrences`
Create a new occurrence.

Body (`application/json`):

```json
{
  "description": "Luz do corredor avariada",
  "category_id": 1,
  "building_zone": "Bloco A",
  "latitude": 41.178,
  "longitude": -8.598
}
```

Required fields:
- `description`
- `category_id`
- `building_zone`
- `latitude`
- `longitude`

Allowed `building_zone` values:
- `Bloco A`
- `Bloco B`
- `Bloco C`
- `Bloco D`
- `Bloco E`
- `Bloco F`
- `Bloco G`

Notes:
- The logged user becomes the owner of the occurrence
- `status_id` is created automatically as `1`
- `priority` is created automatically as `Low`

Common errors to test:
- Missing token -> `401`
- Missing required field(s) -> `400`
- Invalid building zone -> `400`

#### `PATCH /occurrences/:occurrence_id`
Update an occurrence.

Body for normal user updates (`application/json`):

```json
{
  "description": "Luz do corredor principal avariada",
  "category_id": 2,
  "building_zone": "Bloco B",
  "latitude": 41.179,
  "longitude": -8.599
}
```

Body for admin/staff treatment (`application/json`):

```json
{
  "status_id": 2,
  "priority": "High",
  "expected_date": "2026-06-05",
  "resolution_date": "2026-06-06T14:30:00Z"
}
```

Notes:
- Students/teachers can only edit their own occurrence
- They can only edit it while the occurrence is still in status `1`
- Admin/staff can update treatment fields

Common errors to test:
- Missing token -> `401`
- Editing another user occurrence -> `403`
- Updating a processed occurrence as a normal user -> `400`
- Occurrence not found -> `404`

#### `DELETE /occurrences/:occurrence_id`
Delete an occurrence.

No body required.

Notes:
- Admin can delete any occurrence
- Staff cannot delete occurrences
- Normal users can only delete their own occurrence while it is still pending

Common errors to test:
- Missing token -> `401`
- Staff trying to delete -> `403`
- Normal user deleting another user occurrence -> `403`
- Normal user deleting an occurrence already being processed -> `400`
- Occurrence not found -> `404`

#### `POST /occurrences/:occurrence_id/photos`
Upload a photo for an occurrence.

Headers:
- `Authorization: Bearer <JWT_TOKEN>`
- Use `multipart/form-data`

Form-data fields:
- `photo` = file

No JSON body is needed.

Common errors to test:
- Missing token -> `401`
- Missing file -> `400`
- Occurrence not found -> `404`

#### `DELETE /occurrences/:occurrence_id/photos/:photo_id`
Delete a photo.

No body required.

Common errors to test:
- Missing token -> `401`
- Photo not found -> `404`

---

## Comments

#### `POST /occurrences/:occurrence_id/comments`
Create a comment for an occurrence.

Body (`application/json`):

```json
{
  "content": "Já existe alguém a tratar deste problema?"
}
```

Common errors to test:
- Missing token -> `401`
- Empty content -> `400`
- Occurrence not found -> `404`
- Comment on a resolved occurrence -> `400`

#### `PATCH /comments/:comment_id`
Flag a comment as inappropriate.

No body required.

Notes:
- Admin and staff can flag any comment
- Normal users can only flag comments related to occurrences they created

Common errors to test:
- Missing token -> `401`
- Comment not found -> `404`
- User not allowed to flag that comment -> `403`

#### `DELETE /comments/:comment_id`
Delete a comment.

No body required.

Notes:
- Admin only

Common errors to test:
- Missing token -> `401`
- Non-admin token -> `403`
- Comment not found -> `404`

---

## Extra Error Tests for Postman

These are useful requests to validate the API behavior.

### Invalid JSON
Send a malformed JSON body to any `POST` or `PUT` endpoint.

Expected response:
- `400`
- `{"description":"Invalid JSON payload"}`

### Missing Token
Call any protected endpoint without the `Authorization` header.

Expected response:
- `401`
- `{"message":"Acesso negado. Token não fornecido."}`

### Invalid / Expired Token
Use a bad JWT token in `Authorization`.

Expected response:
- `403`
- `{"message":"Token inválido ou expirado."}`

### Wrong Role
Try admin-only endpoints like:
- `POST /categories`
- `PUT /categories/:category_id`
- `DELETE /categories/:category_id`
- `POST /status`
- `PUT /status/:status_id`
- `DELETE /status/:status_id`
- `DELETE /comments/:comment_id`

Expected response:
- `403`

### Not Found
Use a non-existing ID in `:user_id`, `:category_id`, `:status_id`, `:occurrence_id`, `:comment_id`, or `:photo_id`.

Expected response:
- `404`

## Recommended Postman Collection Order

1. Register user
2. Login user
3. Save JWT token in Postman environment
4. Create category/status as admin
5. Create occurrence
6. Add comment
7. Upload photo
8. Test update and delete routes

## Quick Note

Your project also has `PATCH` routes in addition to `POST`, `PUT`, and `DELETE`. I included them here because they are part of the current API and are useful in Postman.