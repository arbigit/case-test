ChatGPT said:
Absolutely — here's a clean, easy-to-read, and well-formatted version you can copy and paste directly into Upwork:

Job Title: Web App Fixes and Feature Updates for Case Management + Analytics Dashboard

Overview:
We need updates and bug fixes made to a custom web app used to manage dental lab cases and view analytics. This includes page navigation fixes, pop-up alerts, data tracking, and formatting of charts on the analytics page.

Login & Access Control:

App should be password protected

Password: cda (all lowercase)

Home Page:

Keep the layout as is

Remove the "(+ Add New Lab)" button

Add Case Page:

Fix the Back Arrow so it returns to the Home Page

When all 5 required fields are filled (Date, First Name, Last Initial, etc.) and the form is submitted, show a pop-up:

"Case has been submitted."

If a user tries to leave the page without submitting, show a pop-up:

"Case entry will not be saved."

Revise Case Page:

Fix the Back Arrow so it returns to the Home Page

Add same pop-ups as the Add Case page

Fix the Delete button (currently not working)

All changes must reflect in the Analytics page

Analytics Page Updates:

1. Period Range Filter

User must select one:

1 Month, 3 Months, YTD, 1 Year, 5 Years, All Time

This will filter all data shown below

2. Metrics Overview:

Overall Score: Average score of all metrics

Total Cases: Total cases in the selected period

Success Rate:
(Cases with all scores ≥ 1) ÷ (Total cases)

Return Rate:
(Cases with at least one score = 0) ÷ (Total cases)

Note: Even one zero = failure

Success Rate + Return Rate should always = 100%

3. Revision Success Rate:

Tracks cases that were initially failed (score of 0 in any metric) and later updated to all 1s or 2s

Formula:
(Revised cases where all 0s became ≥1) ÷ (Total failed cases)

Charts (Fixes Needed):

Metric Trends Chart:

Adjust x-axis spacing (weekly for 1-month range, etc.)

Allow users to choose which metric is displayed

Success Rate Trend Chart:

Fix x-axis spacing to match selected date range

Average Metrics Table:

Works correctly — no change needed

Return Breakdown Pie Chart:

Clean up visual stacking when no zero exists for certain metrics

Score Distribution Chart:

Change from multiple columns to stacked bar format

Other Feature Request:

Add a "Generate Report" button at the top of the Analytics page
