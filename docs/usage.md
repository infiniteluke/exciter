## Usage

```javascript
const Exciter = require('exciter');
const exciter = new Exciter();
const data = {
  id: '1f9a72be-bcc1-4552-aec0-53a8bc377bb5',
  things: 'to store in DynamoDB',
};
const primaryKey = { id: data.id };
const tableName = 'someTable';

// Create a record.
exciter.create(data, primaryKey, tableName)
  .then((awsResponse) => {
    // Creation was successful, now we can do something with the response.
  });

// Update a record. Each top-level property provided in data will be replaced.
exciter.update(data, primaryKey, tableName)
  .then((awsResponse) => {
    // Update was successful, now we can do something with the response.
  });

// Put a record. The entire entity will be replaced.
exciter.put(data, primaryKey, tableName)
  .then((awsResponse) => {
    // Put was successful, now we can do something with the response.
  });

// Load a record.
exciter.load(primaryKey, tableName)
  .then((awsResponse) => {
    // Load was successful, now we can do something with the response.
  });

// Query for records.
exciter.query(primaryKey, tableName)
  .then((awsResponse) => {
    // Query was successful, now we can do something with the response.
  });

// Delete a record.
exciter.delete(primaryKey, tableName)
  .then((awsResponse) => {
    // Delete was successful, now we can do something with the response.
  });
```
