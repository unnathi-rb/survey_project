## 2. Domain and Architecture Note

### Domain Design

The main parts of the application are `Survey` and `SurveyResponse`.

- **Survey:** Handles the survey title, description, questions, and status. It also controls the survey lifecycle, such as creating a draft, publishing it, and closing it.
- **SurveyResponse:** Stores the answers submitted by a respondent for a published survey.

The survey rules are handled in the domain layer. For example, a survey cannot be published if its questions are invalid. Once published, its questions and options cannot be changed. Responses can only be submitted while the survey is published.

Keeping these rules in the domain layer means they still apply even if a request comes directly through the API instead of the browser.

### Application Layer

The application layer connects the domain logic with the rest of the application. It handles operations such as creating a survey, publishing or closing it, submitting responses, and retrieving paginated survey and response lists.

It also coordinates data access through repository interfaces or clearly defined contracts, so the business logic does not need to know how the data is stored.

### Infrastructure and API Layer

The infrastructure layer handles database operations using MongoDB and Mongoose. It implements the repository contracts and keeps database-specific code separate from the domain logic.

The API layer receives requests from the frontend, checks the request format, calls the relevant application operation, and returns the appropriate response. It also converts errors into suitable HTTP responses with clear messages.

### Dependency Direction

The domain layer does not depend on the API, web framework, or database. The application layer uses the domain rules, while the infrastructure layer connects those rules to the database. The API layer passes requests to the application layer.

This separation makes the code easier to understand, test, and maintain. It also means that database or API changes are less likely to affect the core survey rules.

### Design Trade-offs

I kept the structure focused on the main requirements of the assignment instead of adding unnecessary layers. Separating the domain, application, API, and database code makes the important rules easier to find and change. The trade-off is that this structure requires some extra files and interfaces compared with putting everything in controllers, but it helps keep the code organized as the application grows.

## 3. Acceptance Checklist

### 1. Draft Editing and Preview

**Steps**
- Create a survey draft containing all five question types.
- Edit and delete a question.
- Add and delete a choice option.
- Save the survey, reload it, and check the changes.
- Try adding a sixth question.
- Open the preview.

**Expected:** Changes should remain after saving and reloading. The application should reject a sixth question. The preview should show the latest survey form without creating a response.

**Actual:** [Record what happened.]

**Evidence:** [Add a screenshot or relevant API response.]

### 2. Publication Validation

**Steps**
- Try publishing an empty survey.
- Try publishing a survey with an invalid question or choice definition.
- Correct the definitions and publish the survey.
- Try submitting a response directly through the API while the survey is still a draft.

**Expected:** Invalid surveys should not be published, and the application should explain the problem clearly. A valid survey should publish successfully. Direct API submissions to a draft should be rejected.

**Actual:** [Record what happened.]

**Evidence:** [Add screenshots or API responses.]

### 3. Published Questions Stay Fixed

**Steps**
- Publish a survey.
- Try editing, adding, or deleting questions and choice options through the browser.
- Repeat these attempts through the API.
- If responses already exist, try making the changes again.
- Try publishing repeatedly or performing an invalid lifecycle transition.

**Expected:** The published survey's questions and options should remain unchanged. Repeated publishing or invalid lifecycle transitions should not reset or alter the survey definition.

**Actual:** [Record what happened.]

**Evidence:** [Add screenshots or API responses showing the attempts and results.]

### 4. Valid Answers Persist

**Steps**
- Start the application and its dependencies using Docker Compose.
- Submit valid answers covering all five question types.
- Submit another response that skips an optional question.
- Reload the responses and check the saved answers and response count.
- Restart the API and dependency stack without deleting the data volumes.

**Expected:** Valid responses should be saved correctly, including responses that skip optional questions. The answers and response count should remain available after restarting the application and dependencies.

**Actual:** [Record what happened.]

**Evidence:** [Add screenshots or API responses before and after restarting.]

### 5. Invalid Answers Are Rejected by the API

**Steps**

Send direct API requests containing each of these invalid cases:

- A blank answer to a required question.
- An answer with the wrong data type.
- An unknown question ID.
- An unknown choice option.
- The same question answered more than once in one submission.
- An empty answer to a required checkbox question.
- Ratings of `0`, `6`, and `2.5`.

**Expected:** Every invalid submission should be rejected. No invalid response should be saved, and the response count should not increase.

**Actual:** [Record the result of each case.]

**Evidence:** [Add the API requests and their responses.]

### 6. Closing Stops New Responses

**Steps**
- Open a published survey in the respondent view.
- Close the survey from the author screen.
- Try submitting the response from the already-open respondent form.
- Check the existing responses and results.
- Open the respondent view again.

**Expected:** The API should reject the submission after the survey is closed, even if the form was opened earlier. Existing responses and results should remain available, and the respondent screen should clearly indicate that the survey is closed.

**Actual:** [Record what happened.]

**Evidence:** [Add screenshots or API responses.]

### 7. Survey and Response Lists Support Pagination

**Steps**
- Use seeded data to create enough surveys and responses for multiple pages.
- Navigate through several pages of both lists.
- Check the API requests and total counts.
- With the data unchanged, revisit pages and check their order and contents.
- Test the status filter and confirm that changing it resets pagination appropriately.
- Check the first page, last page, empty results, and a page beyond the available results.
- Try invalid and over-limit pagination values.
- Check how the interface handles loading and request failures.

**Expected:** Both lists should use server-side pagination and show correct totals. Results should have a stable order without overlapping records between pages when the data is unchanged. Filters and invalid pagination values should be handled correctly, and loading or failure states should be clear.

**Actual:** [Record what happened.]

**Evidence:** [Add screenshots and relevant API requests and responses.]

### 8. Results Include All Responses

**Steps**
- Create a survey with known responses across multiple response-list pages.
- Check the text answers and the count for each option.
- Verify the total number of submissions and the average ratings.
- Change the response-list page and check whether the summary changes.
- Check results for skipped optional answers.
- Check the results for a survey with no responses.

**Expected:** Results should include all responses, not just those on the currently displayed page. Option counts, total submissions, and rating averages should match the full dataset. Changing the response-list page should not change the summaries. Skipped optional answers and surveys with no responses should be displayed correctly.

**Actual:** [Record what happened.]

**Evidence:** [Add screenshots or API responses that show the results and calculations.]