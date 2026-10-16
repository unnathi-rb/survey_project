# Survey Builder API Notes

**Base URL:** `http://localhost:4000`

All requests and responses use JSON. There is no login required. The API has two parts: author routes for creating and managing surveys, and respondent routes for filling them out.

## Errors

Errors return a simple message like `{ "error": "Survey not found" }`.

A `400` error means something is wrong with the request, a `404` means the survey or question doesn't exist, and a `409` means the request is valid but the survey is in the wrong state. Database errors are handled internally and are not exposed to the user.

## Pagination

Survey lists and response lists support pagination using `page` and `pageSize`. By default, the API returns page 1 with 10 items. The page must be a whole number greater than or equal to 1, and pageSize must be between 1 and 50.

Results are sorted newest first. If two items have the same timestamp, the one with the larger ID comes first, keeping the order consistent between pages.

If you request a page beyond the available results, you get an empty list with the correct totals. Invalid values, such as `page=0` or `pageSize=1000`, return a `400` error.

## Author Routes

### Create a survey — `POST /surveys`

Creates a new survey as a draft with no questions. Send a title and an optional description. The title must be text and cannot be missing. On success, the API returns the new survey with status `draft` and a `201` response.

### List surveys — `GET /surveys`

Returns a paginated list of surveys. You can use `page` and `pageSize` to control pagination and optionally filter by status: `draft`, `published`, or `closed`. The status filter is applied before pagination.

### Get one survey — `GET /surveys/:id`

Returns a survey with its questions and options. If the survey doesn't exist, the API returns `404`.

### Delete a survey — `DELETE /surveys/:id`

Only draft surveys can be deleted. A successful deletion returns `204` with no response body. If the survey doesn't exist, the API returns `404`. If it is published or closed, the API returns `409`.

### Editing a draft

You can only edit surveys while they are in the `draft` state. Published and closed surveys cannot be changed. Trying to edit one returns `409` with the message `Only a draft survey can be changed`.

You can add a question using `POST /surveys/:id/questions`, providing its type and label. The supported types are `short_text`, `long_text`, `single_choice`, `multiple_choice`, and `rating`. Each survey can have a maximum of five questions.

Use `PATCH /surveys/:id/questions/:questionId` to update a question's label, helper text, or required setting. Use `DELETE /surveys/:id/questions/:questionId` to remove a question.

To change the order of questions, use `PATCH /surveys/:id/questions/:questionId/move` with the direction set to `up` or `down`. A question cannot move beyond the first or last position.

You can also duplicate a question using `POST /surveys/:id/questions/:questionId/duplicate`. The copied question and its options receive new IDs. The five-question limit still applies.

For choice questions, use `POST /surveys/:id/questions/:questionId/options` to add an option and `DELETE /surveys/:id/questions/:questionId/options/:optionId` to remove one. Only choice questions can have options.

Successful editing requests return the updated survey. Invalid input returns `400`, missing surveys or questions return `404`, and operations that violate survey rules return `409`.

### Publishing a survey — `POST /surveys/:id/publish`

A survey can be published only when it is a draft. Before publishing, it must have a non-blank title, between one and five questions, a label for every question, and at least two different, non-blank options for every choice question.

If any requirement is not met, the API returns `409` and explains the problems. Once published, the questions cannot be changed.

### Closing a survey — `POST /surveys/:id/close`

Closes a published survey so that no more responses can be submitted. Existing responses and results remain available. Only published surveys can be closed.

### View responses — `GET /surveys/:id/responses`

Returns the responses submitted to a survey, newest first. The results are paginated using `page` and `pageSize`. Invalid pagination values return `400`, and a missing survey returns `404`.

### View results — `GET /surveys/:id/results`

Returns a summary of all responses, regardless of pagination. It includes the total number of responses and a summary for each question.

Choice questions show how many times each option was selected, including zero counts. For multiple-choice questions, each selected option is counted once per response.

Rating questions show the average of the ratings submitted and the count for each rating. Only answered ratings are included in the average. If nobody answered, the average is `null`.

Text questions return a list of text answers. If there are no responses, the total is zero and all counts are zero.

## Respondent Routes

### Get a survey form — `GET /surveys/:id/form`

Returns the survey details and questions that a respondent needs to fill out. Only published surveys are available. Draft surveys and surveys that don't exist return `404`. Closed surveys return `409`.

### Submit answers — `POST /surveys/:id/responses`

Accepts the respondent's answers and saves them only if every validation check passes.

For short-text and long-text questions, the answer must be text. For single-choice questions, it must be the ID of one option belonging to that question. For multiple-choice questions, it must be a list of valid option IDs; duplicate IDs count only once. For rating questions, it must be a whole number from 1 to 5.

The server validates every answer, even if the browser has already checked it. The survey must be published, every question ID must be valid and appear only once, and every answer must match its question type. Option IDs must belong to the correct question.

Required questions must have a real answer. Missing answers, blank text, and empty lists are not accepted for required questions. Optional questions can be skipped. Ratings such as `0`, `6`, or `2.5` are rejected.

If any answer is invalid, nothing is saved, and the API returns `400` with the validation problems. A successful submission returns the saved response with status `201`. A missing survey returns `404`, while draft or closed surveys return `409` with an appropriate message.