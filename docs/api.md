# Survey Builder API Notes

**Base URL:** `http://localhost:4000`

All requests and responses use JSON. There is no login required. The API has two parts: author routes for creating and managing surveys, and respondent routes for filling them out.

## Errors

Errors return a readable message like `{ "error": "Survey not found" }`.

A `400` error means the request contains invalid data, a `404` means the survey or question doesn't exist, and a `409` means the request is valid but the survey is in the wrong state. Anything unexpected, such as a database failure, returns `500` with a plain message and no internal details. Malformed JSON returns `400`.

Example error responses:

```json
{ "error": "Survey not found" }
```
```json
{ "error": "Only a draft survey can be changed" }
```

## Pagination

Survey lists and response lists support pagination using `page` and `pageSize`. By default, `page` is `1` and `pageSize` is `10`. The page must be a whole number greater than or equal to 1, and pageSize must be between 1 and 50.

Results are sorted newest first. If two items have the same timestamp, the one with the larger ID comes first, keeping the order consistent between pages.

Requesting a page beyond the available results returns an empty `items` list with the correct totals. Invalid values, such as `page=0` or `pageSize=1000`, return `400`.

Example response:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 10,
  "total": 31,
  "totalPages": 4
}
```

Example error responses (`400`):

```json
{ "error": "page must be a whole number of 1 or more" }
```
```json
{ "error": "pageSize cannot be more than 50" }
```

## Author Routes

### Create a survey — `POST /surveys`

Creates a new survey as a draft with no questions. Send a title and an optional description. The title is required and must be text. A successful request returns `201` with the new survey.

Request:

```json
{ "title": "Week 1 check-in", "description": "How is your first week going?" }
```

Response `201`:

```json
{
  "id": "3a84f6ba-9e60-48b3-90f1-8b89e7ebd6be",
  "title": "Week 1 check-in",
  "description": "How is your first week going?",
  "status": "draft",
  "questions": [],
  "createdAt": "2026-10-19T08:30:00.000Z"
}
```

### List surveys — `GET /surveys`

Returns a paginated list of surveys. You can use `page` and `pageSize` to control pagination and optionally filter by status: `draft`, `published`, or `closed`. The status filter is applied before pagination. An invalid status returns `400` with `status must be draft, published or closed`.

Example: `GET /surveys?status=published&page=2&pageSize=10`

### Get one survey — `GET /surveys/:id`

Returns a survey with its questions and options. If the survey doesn't exist, the API returns `404`.

A survey contains an ID, title, description, status, creation date, and a list of questions. Each question has an ID, type, label, helper text, required setting, and options.

Supported question types are `short_text`, `long_text`, `single_choice`, `multiple_choice`, and `rating`.

### Delete a survey — `DELETE /surveys/:id`

Only draft surveys can be deleted. A successful deletion returns `204` with no response body. A missing survey returns `404`, and a survey that is published or closed returns `409` with `Only a draft survey can be deleted`.

## Editing a Draft

You can only edit surveys while they are in the `draft` state. Published and closed surveys cannot be changed. Trying to edit one returns `409` with `Only a draft survey can be changed`.

You can add a question using `POST /surveys/:id/questions`, providing its type and label. Each survey can have a maximum of five questions. A sixth question returns `409` with `A survey can have at most 5 questions`.

Request:

```json
{ "type": "single_choice", "label": "How is the team?" }
```

Response `201`: the updated survey, with the new question at the end:

```json
{
  "id": "3a84f6ba-...",
  "status": "draft",
  "questions": [
    {
      "id": "7fe1c2d0-...",
      "type": "single_choice",
      "label": "How is the team?",
      "helperText": "",
      "required": false,
      "options": []
    }
  ]
}
```

Use `PATCH /surveys/:id/questions/:questionId` to update a question's label, helper text, or required setting. Use `DELETE /surveys/:id/questions/:questionId` to remove a question.

To change the order of questions, use `PATCH /surveys/:id/questions/:questionId/move` with the direction set to `up` or `down`. A question cannot move beyond the first or last position.

For choice questions, use `POST /surveys/:id/questions/:questionId/options` to add an option and `DELETE /surveys/:id/questions/:questionId/options/:optionId` to remove one. Only choice questions can have options.

Successful editing requests return the updated survey. Invalid input returns `400`, missing surveys or questions return `404`, and operations that violate survey rules return `409`.

## Publishing a Survey — `POST /surveys/:id/publish`

Publishes a draft survey. Before publishing, it must have a non-blank title, between one and five questions, a label for every question, and at least two different, non-blank options for every choice question.

If any requirement is not met, the API returns `409` and lists the problems. Once published, the questions cannot be changed. Publishing a survey that is not a draft also returns `409`, and nothing is reset.

Example error responses (`409`):

```json
{ "error": "Cannot publish: Question 1: A choice question needs at least two options" }
```
```json
{ "error": "Only a draft survey can be published" }
```

## Closing a Survey — `POST /surveys/:id/close`

Closes a published survey so that no more responses can be submitted. Existing responses and results remain available. Only published surveys can be closed; otherwise, the API returns `409` with `Only a published survey can be closed`.

## View Responses — `GET /surveys/:id/responses`

Returns a paginated list of responses for a survey, newest first. Each response contains its ID, survey ID, answers, and submission date. Invalid pagination values return `400`, and a missing survey returns `404`.

## View Results — `GET /surveys/:id/results`

Returns a summary of all responses, regardless of pagination. The result includes the total number of responses and a summary for each question.

Choice questions show the count for every option, including options nobody selected. Each selected option counts once per response.

Rating questions show the average of answered ratings and the count for each rating. If nobody answered, the average is `null`.

Text questions return a `textAnswers` list. If there are no responses, the total is zero and all counts are zero.

Example response:

```json
{
  "totalResponses": 27,
  "questions": [
    {
      "questionId": "7fe1...",
      "label": "How is the team?",
      "type": "single_choice",
      "answeredCount": 27,
      "optionCounts": [
        {
          "optionId": "8bc7...",
          "text": "Great",
          "count": 9
        }
      ]
    },
    {
      "questionId": "9a10...",
      "label": "Rate your first week",
      "type": "rating",
      "answeredCount": 27,
      "average": 2.89,
      "distribution": [
        {
          "rating": 1,
          "count": 6
        }
      ]
    }
  ]
}
```

## Respondent Routes

### Get a survey form — `GET /surveys/:id/form`

Returns the survey details and questions that a respondent needs to fill out. Only published surveys are available. A missing or draft survey returns `404`, while a closed survey returns `409` with `This survey is closed`.

### Submit answers — `POST /surveys/:id/responses`

Accepts the respondent's answers and saves them only if every validation check passes.

For `short_text` and `long_text`, the value must be text. For `single_choice`, it must be an option ID belonging to that question. For `multiple_choice`, it must be a list of valid option IDs; duplicate IDs count only once. For `rating`, it must be a whole number from 1 to 5.

The server validates every answer, even if the browser has already checked it. The survey must be published, every question ID must exist and appear only once, and every answer must match its question type. Option IDs must belong to the correct question.

Required questions must have a real answer. Missing answers, blank text, and empty lists are not accepted for required questions. Optional questions can be skipped. Ratings such as `0`, `6`, or `2.5` are rejected.

If any answer is invalid, nothing is saved, and the API returns `400` with a message listing the problems. A successful submission returns `201` with the saved response. A missing survey returns `404`, while draft or closed surveys return `409` with an appropriate message.

Request:

```json
{
  "answers": [
    { "questionId": "q-name", "value": "Asha" },
    { "questionId": "q-mood", "value": "o-good" },
    { "questionId": "q-tools", "value": ["o-slack", "o-jira"] },
    { "questionId": "q-rating", "value": 4 }
  ]
}
```

Response `201`:

```json
{
  "id": "c91d0e7a-...",
  "surveyId": "3a84f6ba-...",
  "answers": [
    { "questionId": "q-name", "value": "Asha" },
    { "questionId": "q-mood", "value": "o-good" },
    { "questionId": "q-tools", "value": ["o-slack", "o-jira"] },
    { "questionId": "q-rating", "value": 4 }
  ],
  "submittedAt": "2026-10-19T09:12:30.000Z"
}
```

Example error responses:

```json
{ "error": "Invalid response: \"Your name?\": this question is required" }
```
(`400`, required answer missing or blank)

```json
{ "error": "Invalid response: Unknown question: this-id-does-not-exist" }
```
(`400`, unknown question)

```json
{ "error": "Invalid response: \"Team mood?\": not a valid option" }
```
(`400`, unknown option)

```json
{ "error": "Invalid response: \"Rate your week\": Rating must be between 1 and 5" }
```
(`400`, rating 0 or 6)

```json
{ "error": "This survey is closed" }
```
(`409`, closed survey. A draft returns `This survey is not available yet`.)
