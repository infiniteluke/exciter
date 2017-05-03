# exciter

An easy CRUD wrapper for DynamoDB. Working with the DynamoDB SDK is difficult. Exciter abstracts a lot of the DynamoDB-isms away leaving you an intuitive interface for performing CRUD operations on DynamoDB.

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

## Classes

<dl>
<dt><a href="#Exciter">Exciter</a></dt>
<dd><p>Class representing a DynamoDB connection</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#TypedArray">TypedArray</a> : <code>Int8Array</code> | <code>Uint8Array</code> | <code>Uint8ClampedArray</code> | <code>Int16Array</code> | <code>Uint16Array</code> | <code>Int32Array</code> | <code>Uint32Array</code> | <code>Float32Array</code> | <code>Float64Array</code></dt>
<dd><p>Array-like objects which provide a mechanism for accessing raw binary data.</p>
</dd>
<dt><a href="#PrimaryKey">PrimaryKey</a> : <code>Object.&lt;String, (String|Number|Buffer|File|Blob|ArrayBuffer|DataView|TypedArray)&gt;</code></dt>
<dd><p>An object containing two properties. One for the partition/hash key and
another for the sort/range key. The key names should always match your
configuration on the DynamoDB table/index being operated on. The
partition/hash key is always required. The sort/range key is required in
write operations where the table/index uses a composite primary key, but is
optional in every other case.</p>
</dd>
</dl>

<a name="Exciter"></a>

## Exciter
Class representing a DynamoDB connection

**Kind**: global class  

* [Exciter](#Exciter)
    * [new Exciter(options, [rejectOnFail])](#new_Exciter_new)
    * _instance_
        * [.create(data, primaryKey, table)](#Exciter+create) ⇒ <code>Promise</code>
        * [.update(data, primaryKey, table)](#Exciter+update) ⇒ <code>Promise</code>
        * [.put(data, primaryKey, table, createOnly)](#Exciter+put) ⇒ <code>Promise</code>
        * [.patch(data, primaryKey, table)](#Exciter+patch) ⇒ <code>Promise</code>
        * [.load(primaryKey, table)](#Exciter+load) ⇒ <code>Promise</code>
        * [.query(primaryKey, table, query)](#Exciter+query) ⇒ <code>Promise</code>
        * [.delete(primaryKey, table)](#Exciter+delete) ⇒ <code>Promise</code>
        * [.getTotalCount(params, startCount)](#Exciter+getTotalCount) ⇒ <code>Promise</code>
        * [.catchHandler(err)](#Exciter+catchHandler) ⇒ <code>Promise</code>
    * _static_
        * [.normalizeGroup(rawGroup, name)](#Exciter.normalizeGroup) ⇒ <code>Object</code>
        * [.normalizeCondition(rawCondition, name)](#Exciter.normalizeCondition) ⇒ <code>Object</code>
        * [.normalizeExpressionAttribute(rawValue, name)](#Exciter.normalizeExpressionAttribute) ⇒ <code>Object</code>
        * [.normalizeDataValues(data)](#Exciter.normalizeDataValues) ⇒ <code>Array</code>
        * [.buildUpdateExpression(attributes)](#Exciter.buildUpdateExpression) ⇒ <code>String</code>
        * [.buildConditionExpression(conditions, groupOperator)](#Exciter.buildConditionExpression) ⇒ <code>String</code>
        * [.buildExpressionPlaceholders(attributes, substitutionChar)](#Exciter.buildExpressionPlaceholders) ⇒ <code>Object</code>
        * [.valueIsEmpty(value)](#Exciter.valueIsEmpty) ⇒ <code>boolean</code>

<a name="new_Exciter_new"></a>

### new Exciter(options, [rejectOnFail])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| options | <code>Object</code> |  | AWS DynamoDB.DocumentClient constructor options. |
| [rejectOnFail] | <code>boolean</code> | <code>true</code> | Whether DynamoDB operations should return a rejected promise if they fail. |

<a name="Exciter+create"></a>

### exciter.create(data, primaryKey, table) ⇒ <code>Promise</code>
Creates a record.

**Kind**: instance method of <code>[Exciter](#Exciter)</code>  
**Returns**: <code>Promise</code> - Resolves when the document has been written to DynamoDB, rejects if there
  was an error.  
**See**: put  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Data to store in the given DynamoDB table. |
| primaryKey | <code>[PrimaryKey](#PrimaryKey)</code> | A [PrimaryKey](#PrimaryKey) object containing partitionKey and sortKey key/value   properties.   NOTE: The values provided here will override properties of the same names   contained in the data argument if they are present there. |
| table | <code>String</code> | The table in which to save the document. |

<a name="Exciter+update"></a>

### exciter.update(data, primaryKey, table) ⇒ <code>Promise</code>
Updates an existing record accepting full or partial data.

This is a convenience method which simply proxies the patch() method.

**Kind**: instance method of <code>[Exciter](#Exciter)</code>  
**Returns**: <code>Promise</code> - Resolves when the document has been written to DynamoDB, rejects if there
  was an error.  
**See**: patch  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Data to store in the given DynamoDB table. Each top-level property will   become a top-level attribute in the DynamoDB table and will replace any   existing top-level attribute with the same name entirely. We'd like to   allow partial property updates which would recursively replace the   structure provided while leaving any missing sub-properties untouched,   but unfortunately we are prevented by this issue:   https://forums.aws.amazon.com/thread.jspa?threadID=162907 |
| primaryKey | <code>[PrimaryKey](#PrimaryKey)</code> | A [PrimaryKey](#PrimaryKey) object containing partitionKey and sortKey key/value   properties. |
| table | <code>String</code> | The table in which to save the document. |

<a name="Exciter+put"></a>

### exciter.put(data, primaryKey, table, createOnly) ⇒ <code>Promise</code>
Creates or entirely replaces an existing record.

**Kind**: instance method of <code>[Exciter](#Exciter)</code>  
**Returns**: <code>Promise</code> - Resolves when the document has been written to DynamoDB, rejects if there
  was an error.  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Data to store in the given DynamoDB table. |
| primaryKey | <code>[PrimaryKey](#PrimaryKey)</code> | A [PrimaryKey](#PrimaryKey) object containing partitionKey and sortKey key/value   properties.   NOTE: The values provided here will override properties of the same names   contained in the data argument if they are present there. |
| table | <code>String</code> | The table in which to save the document. |
| createOnly | <code>Boolean</code> | Whether the operation should succeed if a record with the same partition   key value exists. |

<a name="Exciter+patch"></a>

### exciter.patch(data, primaryKey, table) ⇒ <code>Promise</code>
Updates an existing record accepting full or partial data.

Creates a new record if none exists.

**Kind**: instance method of <code>[Exciter](#Exciter)</code>  
**Returns**: <code>Promise</code> - Resolves when the document has been written to DynamoDB, rejects if there
  was an error.  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Data to store in the given DynamoDB table. Each top-level property will   become a top-level attribute in the DynamoDB table and will replace any   existing top-level attribute with the same name entirely. We'd like to   allow partial attribute updates which would recursively replace the   structure provided while leaving any missing sub-properties untouched,   but unfortunately we are prevented by this issue:   https://forums.aws.amazon.com/thread.jspa?threadID=162907 |
| primaryKey | <code>[PrimaryKey](#PrimaryKey)</code> | A [PrimaryKey](#PrimaryKey) object containing partitionKey and sortKey key/value   properties. |
| table | <code>String</code> | The table in which to save the document. |

<a name="Exciter+load"></a>

### exciter.load(primaryKey, table) ⇒ <code>Promise</code>
Retrieves documents from DynamoDB.

**Kind**: instance method of <code>[Exciter](#Exciter)</code>  
**Returns**: <code>Promise</code> - Resolves when the documents have been retrieved from DynamoDB,
  rejects if there was an error retrieving the documents.  

| Param | Type | Description |
| --- | --- | --- |
| primaryKey | <code>[PrimaryKey](#PrimaryKey)</code> | A [PrimaryKey](#PrimaryKey) object containing partitionKey and sortKey key/value   properties. |
| table | <code>String</code> | The table in which to save the document. |

<a name="Exciter+query"></a>

### exciter.query(primaryKey, table, query) ⇒ <code>Promise</code>
Query DynamoDB.

**Kind**: instance method of <code>[Exciter](#Exciter)</code>  
**Returns**: <code>Promise</code> - A promise which resolves with the query result or rejects if there was an
  error.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| primaryKey | <code>[PrimaryKey](#PrimaryKey)</code> |  | A [PrimaryKey](#PrimaryKey) object containing key value pairs for the DynamoDB   partitionKey and optionally sortKey. |
| table | <code>String</code> |  | The table in which to query. |
| query | <code>Object</code> |  | An object which contains all the necessary information to query DynamoDB. |
| query.index | <code>String</code> |  | The index with which to query. By default, query and scan operations are   performed against the table directly. |
| query.rawFilters | <code>Object</code> | <code>{}</code> | A set of filtering operations keyed by name. |
| query.rawFilters[].path | <code>Mixed</code> |  | The path to the property to filter against. |
| query.rawFilters[].value | <code>Mixed</code> |  | The value of the property to filter against. |
| query.rawFilters[].operator | <code>String</code> |  |  |
| query.rawFilters[].memberOf | <code>String</code> |  |  |
| query.rawFilters[].negate | <code>Boolean</code> |  |  |
| query.limit | <code>Integer</code> | <code>10</code> | The number of results to return per page. |
| query.pageForward | <code>Boolean</code> | <code>true</code> | Whether the query should be running in forward sort order. Passing false   will result in reverse sort order. Defaults to true (forward sort order). |
| query.sortAscending | <code>Boolean</code> |  | Whether the sort should be in ascending order. If false, results will be   sorted in descending order. Defaults to true. |
| query.startKey | <code>Object</code> &#124; <code>String</code> | <code></code> | The primary key of the record AFTER which the query operation should   begin. This is used for pagination (see "primaryKey" above). The startKey   may also contain the string "last" which will return the last page of   results as if you had paginated to the last page in the result set. This   is useful since otherwise the startKey which would result in the last   page is not known until you paginate all the way through the results. |
| query.includeTotal | <code>Object</code> | <code>false</code> | Determines whether a total count should be included in the response.   Setting this to true will cause a second parallel request to DynamoDB.   DynamoDB does not provide total counts within a regular query response,   so a separate request is necessary to retrieve that information. |

<a name="Exciter+delete"></a>

### exciter.delete(primaryKey, table) ⇒ <code>Promise</code>
Formats data into DynamoDB documents and sends them to
DynamoDB.

**Kind**: instance method of <code>[Exciter](#Exciter)</code>  
**Returns**: <code>Promise</code> - Resolves when the documents have been written to DynamoDB,
  rejects if there was an error either opening the documents or writing
  to DynamoDB.  

| Param | Type | Description |
| --- | --- | --- |
| primaryKey | <code>[PrimaryKey](#PrimaryKey)</code> | A [PrimaryKey](#PrimaryKey) object containing key value pairs for the DynamoDB   partitionKey and sortKey. |
| table | <code>String</code> | The table from which to delete the document. |

<a name="Exciter+getTotalCount"></a>

### exciter.getTotalCount(params, startCount) ⇒ <code>Promise</code>
Gets the total count for a given query.

**Kind**: instance method of <code>[Exciter](#Exciter)</code>  
**Returns**: <code>Promise</code> - Resolves with the total number of records which satisfy the given query.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| params | <code>Object</code> |  | The params for the query for which we want to get a total count. These   are the parameters which would be passed to DocumentClient.query(). |
| startCount | <code>Integer</code> | <code>0</code> | The number from which to start counting. This is used when the result is   too large to count with one request. |

<a name="Exciter+catchHandler"></a>

### exciter.catchHandler(err) ⇒ <code>Promise</code>
Helper to provide uniform handling of rejection behavior.

**Kind**: instance method of <code>[Exciter](#Exciter)</code>  
**Returns**: <code>Promise</code> - A resolved promise if rejectOnFail is truthy. Otherwise, it passes errors
  up the chain by returning a rejected promise with the passed error.  

| Param | Type | Description |
| --- | --- | --- |
| err | <code>mixed</code> | The rejected value. |

<a name="Exciter.normalizeGroup"></a>

### Exciter.normalizeGroup(rawGroup, name) ⇒ <code>Object</code>
Convert raw filter groups into a consistent format for use in condition
expressions.

**Kind**: static method of <code>[Exciter](#Exciter)</code>  
**Returns**: <code>Object</code> - The normalized group object.
  {
    name: <name>
    conjunction: <AND|OR>
  }  
**Throws**:

- <code>Error</code> Will throw an error if an unsuppored conjunction is used.


| Param | Type | Description |
| --- | --- | --- |
| rawGroup | <code>Object</code> | The raw group object to be normalized. |
| name | <code>String</code> | The name of the group. |

<a name="Exciter.normalizeCondition"></a>

### Exciter.normalizeCondition(rawCondition, name) ⇒ <code>Object</code>
Convert raw filter conditions into a consistent format for use in condition
expressions.

**Kind**: static method of <code>[Exciter](#Exciter)</code>  
**Returns**: <code>Object</code> - The normalized condition object.  
**See**: buildConditionExpression()  

| Param | Type | Description |
| --- | --- | --- |
| rawCondition | <code>Object</code> | The raw condition object to be normalized. |
| name | <code>String</code> | The name of the condition. Will be used as the path if none is provided. |

<a name="Exciter.normalizeExpressionAttribute"></a>

### Exciter.normalizeExpressionAttribute(rawValue, name) ⇒ <code>Object</code>
Convert raw attribute values to a consistent format for use in building
DynamoDB expressions.

**Kind**: static method of <code>[Exciter](#Exciter)</code>  
**Returns**: <code>Object</code> - The normalized attribute object.  
**Throws**:

- <code>Error</code> Will throw an error if the attribute is missing a name or value.

**See**: buildExpressionPlaceholders()  

| Param | Type | Description |
| --- | --- | --- |
| rawValue | <code>Mixed</code> | The raw attribute object or value to be normalized. |
| name | <code>String</code> | The name of the attribute. |

<a name="Exciter.normalizeDataValues"></a>

### Exciter.normalizeDataValues(data) ⇒ <code>Array</code>
Nest property value under a value property.
Ensures raw entity data can be processed by buildUpdateExpression

**Kind**: static method of <code>[Exciter](#Exciter)</code>  
**Returns**: <code>Array</code> - An array of normalized values.  
**See**

- normalizeExpressionAttribute()
- buildUpdateExpression()


| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | The raw object to be normalized. |

<a name="Exciter.buildUpdateExpression"></a>

### Exciter.buildUpdateExpression(attributes) ⇒ <code>String</code>
Builds a DynamoDB update expression

**Kind**: static method of <code>[Exciter](#Exciter)</code>  
**Returns**: <code>String</code> - A property escaped expression for udpating DynamoDB.  

| Param | Type | Description |
| --- | --- | --- |
| attributes | <code>Array</code> | An array of data attributes to update on an entity in DynamoDB. |

<a name="Exciter.buildConditionExpression"></a>

### Exciter.buildConditionExpression(conditions, groupOperator) ⇒ <code>String</code>
Builds a DynamoDB conditional expression.

**Kind**: static method of <code>[Exciter](#Exciter)</code>  
**Returns**: <code>String</code> - A property escaped expression for querying DynamoDB.  

| Param | Type | Description |
| --- | --- | --- |
| conditions | <code>Array</code> | A set of conditions from which to create a conditional expression. |
| groupOperator | <code>String</code> | The logical operator which will join the conditions. Defaults to "AND". |

<a name="Exciter.buildExpressionPlaceholders"></a>

### Exciter.buildExpressionPlaceholders(attributes, substitutionChar) ⇒ <code>Object</code>
Builds expression name and value placeholders from a set of attributes. See
http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ExpressionPlaceholders.html

**Kind**: static method of <code>[Exciter](#Exciter)</code>  
**Returns**: <code>Object</code> - A DynamoDB expression attribute values/names object.  

| Param | Type | Description |
| --- | --- | --- |
| attributes | <code>Array</code> | An array of normalized expression attributes as returned by   normalizeExpressionAttribute(). |
| substitutionChar | <code>String</code> | What string to prepend to keys of the object. ex: `#` or `:` |

<a name="Exciter.valueIsEmpty"></a>

### Exciter.valueIsEmpty(value) ⇒ <code>boolean</code>
Determines whether a value is empty according to DynamoDB.

DynamoDB does not allow us to store undefined, empty string, or empty
array values. This function can be paired with a filter to skip empty
values when writing to DynamoDB.

**Kind**: static method of <code>[Exciter](#Exciter)</code>  
**Returns**: <code>boolean</code> - Whether or not the value is valid for DynamoDB storage.  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>mixed</code> | The value to validate. |

<a name="TypedArray"></a>

## TypedArray : <code>Int8Array</code> &#124; <code>Uint8Array</code> &#124; <code>Uint8ClampedArray</code> &#124; <code>Int16Array</code> &#124; <code>Uint16Array</code> &#124; <code>Int32Array</code> &#124; <code>Uint32Array</code> &#124; <code>Float32Array</code> &#124; <code>Float64Array</code>
Array-like objects which provide a mechanism for accessing raw binary data.

**Kind**: global typedef  
<a name="PrimaryKey"></a>

## PrimaryKey : <code>Object.&lt;String, (String\|Number\|Buffer\|File\|Blob\|ArrayBuffer\|DataView\|TypedArray)&gt;</code>
An object containing two properties. One for the partition/hash key and
another for the sort/range key. The key names should always match your
configuration on the DynamoDB table/index being operated on. The
partition/hash key is always required. The sort/range key is required in
write operations where the table/index uses a composite primary key, but is
optional in every other case.

**Kind**: global typedef  

## Contributors

[![Luke](https://avatars.githubusercontent.com/u/1127238?s=130)](https://github.com/infiniteluke) | [![Peter Sieg](https://avatars.githubusercontent.com/u/3128659?s=130)](https://github.com/chasingmaxwell) | [![Flip](https://avatars.githubusercontent.com/u/1306968?s=130)](https://github.com/flipactual)
--- | --- | ---
[Luke](https://github.com/infiniteluke) | [Peter Sieg](https://github.com/chasingmaxwell) | [Flip](https://github.com/flipactual)
