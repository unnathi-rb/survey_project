# Domain and architecture notes

## Domain structure

The app is built around two ideas: a survey, and the answers people give to it.

A **Survey** is what the author builds. It has a title, a description, up to five
questions, and a status that moves from draft to published to closed. The survey
owns its questions and their options, so anything that changes them has to go
through the survey itself. That is how it can enforce its own rules, like the
five question limit, and like refusing any edit once it is no longer a draft.

A **SurveyResponse** is one person's submitted answers. It is a separate thing
from the survey, because a survey can collect many responses and they should not
all live inside it. A response only remembers the id of its survey. When someone
submits, the survey is loaded and passed in so the answers can be checked
against it.

Questions and options each get their own id when they are created. Answers store
those ids rather than the text, so fixing a typo in a draft never breaks an
answer.

## Value objects

A few small concepts hold their own rules. A **Rating** can only be a whole
number from 1 to 5, and it cannot be built any other way, so a bad rating can
never exist inside the app. **QuestionType** is the fixed set of five kinds of
question, and **SurveyStatus** is draft, published or closed.

## Where the rules live

All the business rules sit in the domain folder, in plain TypeScript. That code
knows nothing about Express, Mongoose or React.

The survey decides when it can be changed, when it can be published, and when it
can be closed. Publishing checks that there is a title, between one and five
questions, and that every question is valid. A question is valid when it has a
label, and a choice question has at least two different, non-blank options.

The response decides whether it can be created at all. It refuses a survey that
is not published, answers for questions that do not exist, the same question
answered twice, answers of the wrong type, options that do not belong to the
question, missing answers to required questions, and ratings outside 1 to 5.
Repeated checkbox choices are counted once. If anything is wrong it reports
every problem together, and nothing is saved.

Because the rules live here and not in the web layer, a request sent straight to
the API hits the same checks as one coming from the browser.

## How the code is laid out

The **domain** folder holds the survey, the response and the small building
blocks, along with their tests.

The **infrastructure** folder is the only place that knows about MongoDB. It
describes how surveys and responses are stored, and it turns saved data back
into real domain objects.

The **api** folder holds the Express routes. Each route does the same few
things: check that the request has the right shape, load the survey, ask the
domain to do the work, save the result, and send an answer back. The domain
throws plain errors, and a small helper turns them into a 400, 404 or 409 so the
browser gets a readable message.

The domain depends on nothing. The infrastructure depends on the domain, and the
api depends on both.

## Following one request

When a respondent submits the form, the browser sends the answers to the
submit route. The route checks the body is shaped correctly, then loads the
survey from MongoDB. It hands the survey and the answers to
`SurveyResponse.create`, which checks every rule. If they all pass, the response
is saved and the route answers with a 201. If one fails, the error is thrown
before anything is saved, and the route answers with a 400 or 409 and the
message.

## Results and lists

The results summary is worked out over every saved response, so it does not
change when you move to another page of the response list. Both the survey list
and the response list are paged by the database, not the browser, and they are
sorted newest first with the id as a tie-breaker so pages never overlap.