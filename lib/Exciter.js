'use strict';

const aws = require('aws-sdk');
const _ = require('lodash');

/** Class representing a DynamoDB connection */
class Exciter {
  /**
   * Array-like objects which provide a mechanism for accessing raw binary data.
   * @typedef {Int8Array|Uint8Array|Uint8ClampedArray|Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array|Float64Array} TypedArray
   */

  /**
   * An object containing two properties. One for the partition/hash key and
   * another for the sort/range key. The key names should always match your
   * configuration on the DynamoDB table/index being operated on. The
   * partition/hash key is always required. The sort/range key is required in
   * write operations where the table/index uses a composite primary key, but is
   * optional in every other case.
   * @typedef {Object<String, String|Number|Buffer|File|Blob|ArrayBuffer|DataView|TypedArray>} PrimaryKey
   */

  /**
  * @param {Object} options
  *   AWS DynamoDB.DocumentClient constructor options.
  * @param {boolean} [rejectOnFail = true]
  *   Whether DynamoDB operations should return a rejected promise if they fail.
  */
  constructor(options, rejectOnFail) {
    this.dynamo = new aws.DynamoDB.DocumentClient(options);
    this.rejectOnFail = typeof rejectOnFail === 'undefined' ? true : rejectOnFail;
  }

  /**
   * Creates a record.
   *
   * @see put
   *
   * @param {Object} data
   *   Data to store in the given DynamoDB table.
   * @param {PrimaryKey} primaryKey
   *   A {@link PrimaryKey} object containing partitionKey and sortKey key/value
   *   properties.
   *   NOTE: The values provided here will override properties of the same names
   *   contained in the data argument if they are present there.
   * @param {String} table
   *   The table in which to save the document.
   *
   * @return {Promise}
   *   Resolves when the document has been written to DynamoDB, rejects if there
   *   was an error.
   */
  create(data, primaryKey, table) {
    return this.put(data, primaryKey, table, true);
  }

  /**
   * Updates an existing record accepting full or partial data.
   *
   * This is a convenience method which simply proxies the patch() method.
   *
   * @see patch
   *
   * @param {Object} data
   *   Data to store in the given DynamoDB table. Each top-level property will
   *   become a top-level attribute in the DynamoDB table and will replace any
   *   existing top-level attribute with the same name entirely. We'd like to
   *   allow partial property updates which would recursively replace the
   *   structure provided while leaving any missing sub-properties untouched,
   *   but unfortunately we are prevented by this issue:
   *   https://forums.aws.amazon.com/thread.jspa?threadID=162907
   * @param {PrimaryKey} primaryKey
   *   A {@link PrimaryKey} object containing partitionKey and sortKey key/value
   *   properties.
   * @param {String} table
   *   The table in which to save the document.
   *
   * @return {Promise}
   *   Resolves when the document has been written to DynamoDB, rejects if there
   *   was an error.
   */
  update(data, primaryKey, table) {
    return this.patch(data, primaryKey, table);
  }

  /**
   * Creates or entirely replaces an existing record.
   *
   * @param {Object} data
   *   Data to store in the given DynamoDB table.
   * @param {PrimaryKey} primaryKey
   *   A {@link PrimaryKey} object containing partitionKey and sortKey key/value
   *   properties.
   *   NOTE: The values provided here will override properties of the same names
   *   contained in the data argument if they are present there.
   * @param {String} table
   *   The table in which to save the document.
   * @param {Boolean} createOnly
   *   Whether the operation should succeed if a record with the same partition
   *   key value exists.
   *
   * @return {Promise}
   *   Resolves when the document has been written to DynamoDB, rejects if there
   *   was an error.
   */
  put(data, primaryKey, table, createOnly) {
    const payload = {
      TableName: table,
      Item: _.assign({}, data, primaryKey),
    };

    if (createOnly) {
      payload.ConditionExpression = Object.keys(primaryKey)
        .map(name => `attribute_not_exists(#${name})`)
        .join(' OR ');
      payload.ExpressionAttributeNames = this.constructor.buildExpressionPlaceholders(
        this.constructor.normalizeDataValues(primaryKey),
        '#'
      );
    }

    return this.dynamo.put(payload).promise()
      .catch(this.catchHandler.bind(this));
  }

  /**
   * Updates an existing record accepting full or partial data.
   *
   * Creates a new record if none exists.
   *
   * @param {Object} data
   *   Data to store in the given DynamoDB table. Each top-level property will
   *   become a top-level attribute in the DynamoDB table and will replace any
   *   existing top-level attribute with the same name entirely. We'd like to
   *   allow partial attribute updates which would recursively replace the
   *   structure provided while leaving any missing sub-properties untouched,
   *   but unfortunately we are prevented by this issue:
   *   https://forums.aws.amazon.com/thread.jspa?threadID=162907
   * @param {PrimaryKey} primaryKey
   *   A {@link PrimaryKey} object containing partitionKey and sortKey key/value
   *   properties.
   * @param {String} table
   *   The table in which to save the document.
   *
   * @return {Promise}
   *   Resolves when the document has been written to DynamoDB, rejects if there
   *   was an error.
   */
  patch(data, primaryKey, table) {
    return Promise.resolve()
      .then(() => {
        // Populate data values into an array for buildExpressionPlaceholders().
        // Do not attempt to save primaryKey values as attributes. The Key
        // property in the payload takes care of that.
        const values = this.constructor.normalizeDataValues(_.omit(data, Object.keys(primaryKey)));

        const payload = {
          TableName: table,
          Key: primaryKey,
          UpdateExpression: this.constructor.buildUpdateExpression(values),
          ExpressionAttributeNames: this.constructor.buildExpressionPlaceholders(values, '#'),
          ExpressionAttributeValues: this.constructor.buildExpressionPlaceholders(values, ':'),
        };

        return this.dynamo.update(payload).promise();
      })
      .catch(this.catchHandler.bind(this));
  }

  /**
   * Retrieves documents from DynamoDB.
   *
   * @param {PrimaryKey} primaryKey
   *   A {@link PrimaryKey} object containing partitionKey and sortKey key/value
   *   properties.
   * @param {String} table
   *   The table in which to save the document.
   *
   * @return {Promise}
   *   Resolves when the documents have been retrieved from DynamoDB,
   *   rejects if there was an error retrieving the documents.
   */
  load(primaryKey, table) {
    return this.dynamo.get({ TableName: table, Key: primaryKey }).promise()
      .catch(this.catchHandler.bind(this));
  }

  /**
   * Query DynamoDB.
   *
   * @param {PrimaryKey} primaryKey
   *   A {@link PrimaryKey} object containing key value pairs for the DynamoDB
   *   partitionKey and optionally sortKey.
   * @param {String} table
   *   The table in which to query.
   * @param {Object} query
   *   An object which contains all the necessary information to query DynamoDB.
   * @param {String} query.index
   *   The index with which to query. By default, query and scan operations are
   *   performed against the table directly.
   * @param {Object} query.rawFilters={}
   *   A set of filtering operations keyed by name.
   * @param {Mixed} query.rawFilters[].path
   *   The path to the property to filter against.
   * @param {Mixed} query.rawFilters[].value
   *   The value of the property to filter against.
   * @param {String} query.rawFilters[].operator
   * @param {String} query.rawFilters[].memberOf
   * @param {Boolean} query.rawFilters[].negate
   * @param {Integer} query.limit=10
   *   The number of results to return per page.
   * @param {Boolean} query.pageForward=true
   *   Whether the query should be running in forward sort order. Passing false
   *   will result in reverse sort order. Defaults to true (forward sort order).
   * @param {Boolean} query.sortAscending
   *   Whether the sort should be in ascending order. If false, results will be
   *   sorted in descending order. Defaults to true.
   * @param {Object|String} query.startKey=null
   *   The primary key of the record AFTER which the query operation should
   *   begin. This is used for pagination (see "primaryKey" above). The startKey
   *   may also contain the string "last" which will return the last page of
   *   results as if you had paginated to the last page in the result set. This
   *   is useful since otherwise the startKey which would result in the last
   *   page is not known until you paginate all the way through the results.
   * @param {Object} query.includeTotal=false
   *   Determines whether a total count should be included in the response.
   *   Setting this to true will cause a second parallel request to DynamoDB.
   *   DynamoDB does not provide total counts within a regular query response,
   *   so a separate request is necessary to retrieve that information.
   *
   * @return {Promise}
   *   A promise which resolves with the query result or rejects if there was an
   *   error.
   */
  query(primaryKey, table, query) {
    const q = _.defaultsDeep({}, query, {
      rawFilters: {},
      limit: 10,
      pageForward: true,
      sortAscending: true,
      includeTotal: false,
      startKey: null,
    });

    return Promise.resolve()
      .then(() => {
        let retrieveTotal = q.includeTotal;

        // Populate conditions and condition groups from filters.
        const filters = {};
        ['groups', 'conditions'].forEach((array) => {
          const type = _.trimEnd(array, 's');
          filters[array] = Object.keys(q.rawFilters)
            .filter(name => _.has(q.rawFilters[name], type))
            .map(name => this.constructor[`normalize${_.upperFirst(type)}`](
              q.rawFilters[name][type],
              name
            ));
        });

        // Normalize and store primaryKey properties as an array of values.
        const keys = Object.keys(primaryKey)
          // Remove empty key properties. The sort key is optional.
          .filter(name => !this.constructor.valueIsEmpty(primaryKey[name]))
          .map(name => this.constructor.normalizeCondition(primaryKey[name], name));

        // Combine keys and conditions for expression attribute substition.
        const values = keys.concat(filters.conditions);

        // Build params to pass to the DocumentClient.
        const params = {
          KeyConditionExpression: this.constructor.buildConditionExpression(keys),
          ExpressionAttributeNames: this.constructor.buildExpressionPlaceholders(values, '#'),
          ExpressionAttributeValues: this.constructor.buildExpressionPlaceholders(values, ':'),
          ScanIndexForward: q.sortAscending ? q.pageForward : !q.pageForward,
          TableName: table,
          Limit: q.limit,
        };

        // Add optional params.
        if (!_.isEmpty(filters.conditions)) {
          const remainingConditions = _.cloneDeep(filters.conditions);

          // Build groupped expressions.
          let expressions = filters.groups.reduce((groupped, group) => {
            const conditions = _.remove(remainingConditions, con => con.memberOf === group.name);
            if (conditions.length > 0) {
              groupped.push(
                this.constructor.buildConditionExpression(conditions, group.conjunction)
              );
            }
            return groupped;
          }, []);


          // Concatenate groupped conditions with ungroupped conditions.
          if (remainingConditions.length > 0) {
            expressions = expressions.concat(
              this.constructor.buildConditionExpression(remainingConditions)
            );
          }

          params.FilterExpression = expressions.join(' AND ');
        }
        if (q.index) {
          params.IndexName = q.index;
        }
        if (!_.isNull(q.startKey)) {
          if (q.startKey === 'last') {
            // Reverse the scan direction.
            params.ScanIndexForward = !params.ScanIndexForward;
            retrieveTotal = true;
          }
          else {
            params.ExclusiveStartKey = q.startKey;
          }
        }
        if (!_.isEmpty(q.select)) {
          params.Select = q.select;
        }

        const requests = [this.dynamo.query(params).promise()];

        // Optionally include a total count query.
        if (retrieveTotal) {
          requests.push(this.getTotalCount(params));
        }

        return Promise.all(requests);
      })
      .then((res) => {
        const result = _.cloneDeep(res[0]);

        // Get the total count from our count query.
        if (res.length > 1 && !_.isNil(res[1])) {
          result.totalCount = res[1];
        }

        // If pagination is going backwards, reverse the result.
        if (!q.pageForward || q.startKey === 'last') {
          _.reverse(result.Items);
        }

        // If the client requested the last page, limit according to pagination
        // direction.
        if (q.startKey === 'last') {
          // Remove items which would be excluded on the last page if we didn't
          // have to reverse the scan direction to get to the last page.
          result.Items.splice(0, result.Items.length - (result.totalCount % q.limit));
          delete result.LastEvaluatedKey;
        }

        return result;
      })
      .catch(this.catchHandler.bind(this));
  }

  /**
   * Formats data into DynamoDB documents and sends them to
   * DynamoDB.
   *
   * @param {PrimaryKey} primaryKey
   *   A {@link PrimaryKey} object containing key value pairs for the DynamoDB
   *   partitionKey and sortKey.
   * @param {String} table
   *   The table from which to delete the document.
   *
   * @return {Promise}
   *   Resolves when the documents have been written to DynamoDB,
   *   rejects if there was an error either opening the documents or writing
   *   to DynamoDB.
   */
  delete(primaryKey, table) {
    // Set available id attributes.
    const payload = {
      TableName: table,
      Key: primaryKey,
    };

    return this.dynamo.delete(payload).promise()
    .catch(this.catchHandler.bind(this));
  }

  /**
   * Gets the total count for a given query.
   *
   * @param {Object} params
   *   The params for the query for which we want to get a total count. These
   *   are the parameters which would be passed to DocumentClient.query().
   * @param {Integer} startCount=0
   *   The number from which to start counting. This is used when the result is
   *   too large to count with one request.
   *
   * @return {Promise}
   *   Resolves with the total number of records which satisfy the given query.
   */
  getTotalCount(params, startCount) {
    return Promise.resolve()
      .then(() => {
        let totalCount = startCount || 0;
        const countParams = _.assign({}, params, { Select: 'COUNT' });

        // Do not limit count queries.
        delete countParams.Limit;

        // Start the count query at the beginning when we know we haven't
        // started counting yet.
        if (totalCount === 0) {
          delete countParams.ExclusiveStartKey;
        }

        return this.dynamo.query(countParams).promise()
          .then((res) => {
            totalCount += res.Count;

            // Repeat this operation if we weren't able to count all records.
            if (_.has(res, 'LastEvaluatedKey')) {
              countParams.ExclusiveStartKey = res.LastEvaluatedKey;
              return this.getTotalCount(countParams, totalCount);
            }

            return totalCount;
          });
      })
      .catch(this.catchHandler.bind(this));
  }

  /**
   * Helper to provide uniform handling of rejection behavior.
   *
   * @param {mixed} err
   *   The rejected value.
   *
   * @returns {Promise}
   *   A resolved promise if rejectOnFail is truthy. Otherwise, it passes errors
   *   up the chain by returning a rejected promise with the passed error.
   */
  catchHandler(err) {
    if (this.rejectOnFail) {
      return Promise.reject(err);
    }

    return Promise.resolve();
  }

  /**
   * Convert raw filter groups into a consistent format for use in condition
   * expressions.
   *
   * @param {Object} rawGroup
   *   The raw group object to be normalized.
   * @param {String} name
   *   The name of the group.
   *
   * @throws {Error}
   *   Will throw an error if an unsuppored conjunction is used.
   *
   * @returns {Object}
   *   The normalized group object.
   *   {
   *     name: <name>
   *     conjunction: <AND|OR>
   *   }
   */
  static normalizeGroup(rawGroup, name) {
    let conjunction = 'AND';

    if (_.has(rawGroup, 'conjunction')) {
      if (['AND', 'OR'].indexOf(rawGroup.conjunction) === -1) {
        throw new Error(`Unsupported group conjunction: ${rawGroup.conjunction}. Allowed conjunctions: AND, OR.`);
      }

      conjunction = rawGroup.conjunction;
    }

    return { name, conjunction };
  }

  /**
   * Convert raw filter conditions into a consistent format for use in condition
   * expressions.
   *
   * @see buildConditionExpression()
   *
   * @param {Object} rawCondition
   *   The raw condition object to be normalized.
   * @param {String} name
   *   The name of the condition. Will be used as the path if none is provided.
   *
   * @returns {Object}
   *   The normalized condition object.
   */
  static normalizeCondition(rawCondition, name) {
    const condition = this.normalizeExpressionAttribute(rawCondition, name);
    const allowedProps = ['name', 'path', 'operator', 'value', 'memberOf', 'negate'];
    return _.pick(_.assign({ operator: '=' }, condition), allowedProps);
  }

  /**
   * Convert raw attribute values to a consistent format for use in building
   * DynamoDB expressions.
   *
   * @see buildExpressionPlaceholders()
   *
   * @param {Mixed} rawValue
   *   The raw attribute object or value to be normalized.
   * @param {String} name
   *   The name of the attribute.
   *
   * @throws {Error}
   *   Will throw an error if the attribute is missing a name or value.
   *
   * @returns {Object}
   *   The normalized attribute object.
   */
  static normalizeExpressionAttribute(rawValue, name) {
    if (_.isNil(name)) {
      throw new Error('Attribute is missing a name.');
    }

    let attribute = rawValue;
    if (!_.isPlainObject(rawValue) || !_.has(rawValue, 'value')) {
      attribute = { value: rawValue };
    }

    // Fail when value is undefined.
    if (attribute.value === undefined) {
      throw new Error(`Attribute "${name}" is missing a value.`);
    }

    return _.assign({ name }, attribute);
  }

  /**
   * Nest property value under a value property.
   * Ensures raw entity data can be processed by buildUpdateExpression
   *
   * @see normalizeExpressionAttribute()
   * @see buildUpdateExpression()
   *
   * @param {Object} data
   *   The raw object to be normalized.
   *
   * @returns {Array}
   *   An array of normalized values.
   */
  static normalizeDataValues(data) {
    return Object.keys(data)
      .filter(attName => !this.valueIsEmpty(data[attName]))
      .map(attName => this.normalizeExpressionAttribute({ value: data[attName] }, attName));
  }

  /**
   * Builds a DynamoDB update expression
   *
   * @param {Array} attributes
   *   An array of data attributes to update on an entity in DynamoDB.
   *
   * @return {String}
   *   A property escaped expression for udpating DynamoDB.
   */
  static buildUpdateExpression(attributes) {
    const exp = attributes.map((attribute) => {
      let path = attribute.name;
      if (_.has(attribute, 'path')) {
        path = attribute.path.replace(/\./g, `.#${attribute.name}_`);
        path = `${attribute.name}_${path}`;
      }
      return `#${path} = :${attribute.name}`;
    }).join(', ');
    return `SET ${exp}`;
  }

  /**
   * Builds a DynamoDB conditional expression.
   *
   * @param {Array} conditions
   *   A set of conditions from which to create a conditional expression.
   * @param {String} groupOperator
   *   The logical operator which will join the conditions. Defaults to "AND".
   *
   * @return {String}
   *   A property escaped expression for querying DynamoDB.
   */
  static buildConditionExpression(conditions, groupOperator) {
    groupOperator = groupOperator || 'AND';
    let expression = conditions.map((operation) => {
      const condition = [];

      if (operation.negate) {
        // Negate the condition.
        condition.push('NOT ');
      }

      // Format nested paths as DynamoDB would expect.
      let path = operation.name;
      if (_.has(operation, 'path')) {
        path = operation.path.replace(/\./g, `.#${operation.name}_`);
        path = `${operation.name}_${path}`;
      }

      // Handle simple operators.
      if (['=', '<', '>', '<=', '>='].indexOf(operation.operator) !== -1) {
        condition.push(`#${path} ${operation.operator} :${operation.name}`);
      }
      // Handle more complicated operators.
      else {
        // Ensure an array value for operators which require it.
        if (['in', 'notin', 'between'].indexOf(operation.operator) !== -1
            && (!_.isArray(operation.value) || operation.value.length < 2)
           ) {
          throw new Error(`Value must be an array when using the "${operation.operator}" operator.`);
        }

        switch (operation.operator) {
          case '!=': {
            condition.push(`NOT #${path} = :${operation.name}`);
            break;
          }
          case 'notin': {
            condition.push('NOT ');
          }
          // falls through
          case 'in': {
            const list = operation.value.map((val, i) => `:${operation.name}${i}`).join(', ');
            condition.push(`#${path} IN (${list})`);
            break;
          }
          case 'between': {
            condition.push(`#${path} BETWEEN :${operation.name}0 AND :${operation.name}1`);
            break;
          }
          case 'contains': {
            condition.push(`${operation.operator}(#${path}, :${operation.name})`);
            break;
          }
          case 'startswith': {
            condition.push(`begins_with(#${path}, :${operation.name})`);
            break;
          }
          case 'exists': {
            const fun = operation.value ? 'attribute_exists' : 'attribute_not_exists';
            condition.push(`${fun}(#${path})`);
            break;
          }
          default: {
            throw new Error(`Unsupported operator: ${operation.operator}`);
          }
        }
      }

      return `(${condition.join('')})`;
    }).join(` ${groupOperator} `);

    if (conditions.length > 1) {
      expression = `(${expression})`;
    }

    return expression;
  }

  /**
   * Builds expression name and value placeholders from a set of attributes. See
   * http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ExpressionPlaceholders.html
   *
   * @param {Array} attributes
   *   An array of normalized expression attributes as returned by
   *   normalizeExpressionAttribute().
   * @param {String} substitutionChar
   *   What string to prepend to keys of the object. ex: `#` or `:`
   *
   * @return {Object}
   *   A DynamoDB expression attribute values/names object.
   */
  static buildExpressionPlaceholders(attributes, substitutionChar) {
    return attributes.reduce((values, attribute) => {
      // Handle names.
      if (substitutionChar === '#') {
        if (_.has(attribute, 'path')) {
          attribute.path.split('.').forEach((fragment) => {
            values[`${substitutionChar}${attribute.name}_${fragment}`] = String(fragment);
          });
        }
        else {
          values[`${substitutionChar}${attribute.name}`] = String(attribute.name);
        }
      }
      // Handle array values.
      else if (_.isArray(attribute.value)) {
        attribute.value.forEach((val, i) => {
          values[`${substitutionChar}${attribute.name}${i}`] = val;
        });
      }
      // Handle simple values.
      else {
        values[`${substitutionChar}${attribute.name}`] = attribute.value;
      }

      return values;
    }, {});
  }

  /**
   * Determines whether a value is empty according to DynamoDB.
   *
   * DynamoDB does not allow us to store undefined, empty string, or empty
   * array values. This function can be paired with a filter to skip empty
   * values when writing to DynamoDB.
   *
   * @param {mixed} value
   *   The value to validate.
   *
   * @return {boolean}
   *   Whether or not the value is valid for DynamoDB storage.
   */
  static valueIsEmpty(value) {
    return value === undefined || value === '' || (Array.isArray(value) && value.length < 1);
  }

}

module.exports = Exciter;
