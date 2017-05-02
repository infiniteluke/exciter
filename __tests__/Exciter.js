'use strict';

const mockdate = require('mockdate');
const sinon = require('sinon');
const _ = require('lodash');
const Exciter = require('../lib/Exciter');

const exciter = new Exciter({
  accessKeyId: 'COOLACCESSKEYID',
  secretAccessKey: 'SUPERSECRETSHHHH',
  region: 'us-east-1',
}, false);
const exciterAllowReject = new Exciter();

beforeAll(() => {
  mockdate.set(0);
});

afterAll(() => {
  mockdate.reset();
});

/**
 * Helper to stub an AWS promise resolution.
 *
 * @param {mixed} res
 *   The value to resolve with.
 *
 * @return {function}
 *   The stub function returning an object containing a promis() method
 *   similar to the aws-sdk which resolves with the passed parameter.
 */
function awsPromiseResolve(res) {
  return () => ({
    promise: () => Promise.resolve(res),
  });
}

/**
 * Helper to stub an AWS promise rejection.
 *
 * @param {mixed} err
 *   The value to reject with.
 *
 * @return {function}
 *   The stub function returning an object containing a promis() method
 *   similar to the aws-sdk which rejects with the passed parameter.
 */
function awsPromiseReject(err) {
  return () => ({
    promise: () => Promise.reject(err),
  });
}

test('buildUpdateExpression', () => {
  const updateExpression = Exciter.buildUpdateExpression([
    { name: 'key', value: 'value' },
    { name: 'thing', value: 'foo' },
    { name: 'nested_value', path: 'nested.value', value: 'I am nested.' },
    { name: 'nested_double_value', path: 'nested.double.value', value: 'Yeah? Well I am double nested.' },
  ]);
  expect(updateExpression).toEqual('SET #key = :key, #thing = :thing, #nested_value_nested.#nested_value_value = :nested_value, #nested_double_value_nested.#nested_double_value_double.#nested_double_value_value = :nested_double_value');
});

test('buildExpressionPlaceholdersValue', () => {
  const object = [
    { name: 'key', value: 'value' },
    { name: 'thing', value: 'foo' },
    { name: 'video', value: 123 },
    { name: 'array', value: ['one', 'two'] },
    { name: 'nested_value', path: 'nested.value', value: 'I am nested.' },
    { name: 'nested_double_value', path: 'nested.double.value', value: 'Yeah? Well I am double nested.' },
  ];
  const nameExpression = Exciter.buildExpressionPlaceholders(object, ':');
  expect(nameExpression).toEqual({
    ':key': 'value',
    ':thing': 'foo',
    ':video': 123,
    ':array0': 'one',
    ':array1': 'two',
    ':nested_value': 'I am nested.',
    ':nested_double_value': 'Yeah? Well I am double nested.',
  });
});

test('buildExpressionPlaceholdersName', () => {
  const object = [
    { name: 'key', value: 'value' },
    { name: 'thing', value: 'foo' },
    { name: 'video', value: 123 },
    { name: 'nested_value', path: 'nested.value', value: 'I am nested.' },
    { name: 'nested_double_value', path: 'nested.double.value', value: 'Yeah? Well I am double nested.' },
  ];
  const nameExpression = Exciter.buildExpressionPlaceholders(object, '#');
  expect(nameExpression).toEqual({
    '#key': 'key',
    '#thing': 'thing',
    '#video': 'video',
    '#nested_value_nested': 'nested',
    '#nested_value_value': 'value',
    '#nested_double_value_nested': 'nested',
    '#nested_double_value_double': 'double',
    '#nested_double_value_value': 'value',
  });
});

test('deleteSuccess', (done) => {
  expect.assertions(1);
  const pk = {
    userId: '123456',
    uuid: '123-123-123',
  };
  sinon.stub(exciter.dynamo, 'delete').callsFake(awsPromiseResolve(pk));
  return exciter.delete(pk, 'fake')
    .then((res) => {
      expect(res).toEqual(pk);
    })
    .catch((err) => {
      expect(err).toBeUndefined();
    })
    .then(() => {
      exciter.dynamo.delete.restore();
      done();
    });
});

test('deleteFailReject', (done) => {
  expect.assertions(1);
  const pk = {
    userId: '123456',
    uuid: '123-123-123',
  };
  sinon.stub(exciterAllowReject.dynamo, 'delete').callsFake(awsPromiseReject(new Error('Bad thing happened')));
  return exciterAllowReject.delete(pk, 'fake')
    .then(() => {
      expect('Promise should reject if rejectOnFail is true').toBe(false);
    })
    .catch(() => {
      expect(true).toBe(true);
    })
    .then(() => {
      exciterAllowReject.dynamo.delete.restore();
      done();
    });
});

test('createProxy', (done) => {
  expect.assertions(2);
  const putSpy = jest.spyOn(exciter, 'put').mockImplementation(() => Promise.resolve());
  return exciter.create({}, 'table', 'key')
    .then(() => {
      expect(putSpy).toHaveBeenCalledTimes(1);
      expect(putSpy).toHaveBeenCalledWith({}, 'table', 'key', true);
    })
    .catch(err => expect(err).toBeUndefined())
    .then(() => {
      putSpy.mockRestore();
      done();
    });
});

test('updateProxy', (done) => {
  expect.assertions(2);
  const patchSpy = jest.spyOn(exciter, 'patch').mockImplementation(() => Promise.resolve());
  return exciter.update({}, {}, 'table')
    .then(() => {
      expect(patchSpy).toHaveBeenCalledTimes(1);
      expect(patchSpy).toHaveBeenCalledWith({}, {}, 'table');
    })
    .catch(err => expect(err).toBeUndefined())
    .then(() => {
      patchSpy.mockRestore();
      done();
    });
});

test('putReplaceSuccess', (done) => {
  expect.assertions(1);
  const data = {
    key: 'value',
    videos: '123-123-123',
    userId: '123456',
    uuid: '123-123-123',
    skipMe: null,
  };
  const putStub = sinon.stub(exciter.dynamo, 'put').callsFake(awsPromiseResolve(data));
  return exciter.put(data, _.pick(data, ['userId', 'uuid']), 'fake')
    .then((res) => {
      sinon.assert.calledWith(putStub, {
        TableName: 'fake',
        Item: data,
      });
      expect(res).toEqual(data);
    })
    .catch(err => expect(err).toBeUndefined())
    .then(() => {
      putStub.restore();
      done();
    });
});

test('putCreateSuccess', (done) => {
  expect.assertions(1);
  const data = {
    key: 'value',
    videos: '123-123-123',
    userId: '123456',
    uuid: '123-123-123',
    skipMe: null,
  };
  const putStub = sinon.stub(exciter.dynamo, 'put').callsFake(awsPromiseResolve(data));
  return exciter.put(data, _.pick(data, ['userId', 'uuid']), 'fake', true)
    .then((res) => {
      sinon.assert.calledWith(putStub, {
        TableName: 'fake',
        Item: data,
        ConditionExpression: 'attribute_not_exists(#userId) OR attribute_not_exists(#uuid)',
        ExpressionAttributeNames: {
          '#userId': 'userId',
          '#uuid': 'uuid',
        },
      });
      expect(res).toEqual(data);
    })
    .catch(err => expect(err).toBeUndefined())
    .then(() => {
      putStub.restore();
      done();
    });
});

test('putFailReject', (done) => {
  expect.assertions(1);
  const data = {
    key: 'value',
    videos: '123-123-123',
    userId: '123456',
    uuid: '123-123-123',
  };
  sinon.stub(exciterAllowReject.dynamo, 'put').callsFake(awsPromiseReject(new Error('Something bad happened!')));
  return exciterAllowReject.put(data, 'fake')
    .then(() => {
      expect('Promise should reject if rejectOnFail is true').toBe(false);
    })
    .catch((e) => {
      expect(e.message).toEqual('Something bad happened!');
    })
    .then(() => {
      exciterAllowReject.dynamo.put.restore();
      done();
    });
});

test('patchSuccess', (done) => {
  expect.assertions(1);
  const pk = {
    userId: '123456',
    uuid: '123-123-123',
  };
  const data = {
    key: 'value',
    videos: '123-123-123',
    userId: '123456',
    uuid: '123-123-123',
    iAmAMap: { iAmAlsoAMap: { iShouldntGoAway: true } },
  };
  const updateStub = sinon.stub(exciter.dynamo, 'update').callsFake(awsPromiseResolve(pk));
  return exciter.patch(data, pk, 'fake')
    .then((res) => {
      sinon.assert.calledWith(updateStub, {
        TableName: 'fake',
        Key: pk,
        UpdateExpression: 'SET #key = :key, #videos = :videos, #iAmAMap = :iAmAMap',
        ExpressionAttributeNames: { '#key': 'key', '#videos': 'videos', '#iAmAMap': 'iAmAMap' },
        ExpressionAttributeValues: {
          ':key': data.key,
          ':videos': data.videos,
          ':iAmAMap': data.iAmAMap,
        },
      });
      expect(res).toEqual(pk);
    })
    .catch((err) => {
      expect(err).toBeUndefined();
    })
    .then(() => {
      updateStub.restore();
      done();
    });
});

test('patchFailReject', (done) => {
  expect.assertions(1);
  const pk = {
    userId: '123456',
    uuid: '123-123-123',
  };
  const data = {
    key: 'value',
    videos: '123-123-123',
    userId: '123456',
    uuid: '123-123-123',
  };
  sinon.stub(exciterAllowReject.dynamo, 'update').callsFake(awsPromiseReject(new Error('Something bad happened!')));
  return exciterAllowReject.patch(data, pk, 'fake', true)
    .then(() => {
      expect('Promise should reject if rejectOnFail is true').toBe(false);
    })
    .catch((e) => {
      expect(e.message).toEqual('Something bad happened!');
    })
    .then(() => {
      exciterAllowReject.dynamo.update.restore();
      done();
    });
});

test('load', (done) => {
  expect.assertions(1);
  const pk = {
    userId: '123456',
    uuid: '123-123-123',
  };
  const expected = { some: 'ExpectedThing' };
  sinon.stub(exciter.dynamo, 'get').callsFake(awsPromiseResolve(expected));
  return exciter.load(pk, 'fake')
    .then((res) => {
      expect(res).toEqual(expected);
    })
    .catch((err) => {
      expect(err).toBeUndefined();
    })
    .then(() => {
      exciter.dynamo.get.restore();
      done();
    });
});

test('loadError', (done) => {
  expect.assertions(1);
  const pk = {
    userId: '123456',
    uuid: '123-123-123',
  };
  const expectedMessage = 'Dynamo had a sad.';
  sinon.stub(exciterAllowReject.dynamo, 'get').callsFake(awsPromiseReject(new Error(expectedMessage)));
  return exciterAllowReject.load(pk, 'fake')
    .then(res => expect(res).toBeUndefined())
    .catch((err) => {
      expect(err.message).toEqual(expectedMessage);
      exciterAllowReject.dynamo.get.restore();
      done();
    });
});

test('catchHandler', (done) => {
  expect.assertions(2);
  const error = new Error('This is bad.');
  return exciter.catchHandler(error)
    .catch(err => expect(err).toBeUndefined())
    .then(() => {
      expect(true).toBe(true);
      return exciterAllowReject.catchHandler(error);
    })
    .then(res => expect(res).toBeUndefined())
    .catch(err => expect(err.message).toEqual(error.message))
    .then(done);
});


test('querySuccess', (done) => {
  expect.assertions(1);
  const pk = {
    userId: '123456',
    uuid: '123-123-123',
  };
  const expected = { expected: 'thing' };
  const stub = sinon.stub(exciterAllowReject.dynamo, 'query').callsFake(awsPromiseResolve(expected));
  return exciterAllowReject.query(pk, 'fake')
    .then((res) => {
      expect(res).toEqual(expected);
      sinon.assert.calledWith(stub, {
        KeyConditionExpression: '((#userId = :userId) AND (#uuid = :uuid))',
        ExpressionAttributeValues: {
          ':userId': '123456',
          ':uuid': '123-123-123',
        },
        ExpressionAttributeNames: {
          '#userId': 'userId',
          '#uuid': 'uuid',
        },
        TableName: 'fake',
        Limit: 10,
        ScanIndexForward: true,
      });
    })
    .catch(err => expect(err).toBeUndefined())
    .then(() => {
      exciterAllowReject.dynamo.query.restore();
      done();
    });
});

test('queryError', (done) => {
  expect.assertions(1);
  const pk = {
    userId: '123456',
    uuid: '123-123-123',
  };
  const expectedMessage = 'Dynamo had a sad.';
  sinon.stub(exciterAllowReject.dynamo, 'query').callsFake(awsPromiseReject(new Error(expectedMessage)));
  return exciterAllowReject.query(pk, 'fake')
    .catch(err => expect(err.message).toEqual(expectedMessage))
    .then(() => {
      exciterAllowReject.dynamo.query.restore();
      done();
    });
});

test('queryNoUngroupped', (done) => {
  expect.assertions(1);
  const pk = {
    userId: '123456',
    uuid: '123-123-123',
  };
  const filters = {
    andGroup: {
      group: {
        conjunction: 'OR',
      },
    },
    firstGroupedFilter: {
      condition: {
        path: 'first',
        value: 'one',
        memberOf: 'andGroup',
      },
    },
    secondGroupedFilter: {
      condition: {
        path: 'second',
        value: 'two',
        memberOf: 'andGroup',
      },
    },
  };
  const expected = { expected: 'thing' };
  const dynamoQuery = {
    startKey: pk,
    rawFilters: filters,
    select: 'ALL_ATTRIBUTES',
  };
  const stub = sinon.stub(exciterAllowReject.dynamo, 'query').callsFake(awsPromiseResolve(expected));
  return exciterAllowReject.query(pk, 'fake', dynamoQuery)
    .then((res) => {
      expect(res).toEqual(expected);
      sinon.assert.calledWith(stub, {
        KeyConditionExpression: '((#userId = :userId) AND (#uuid = :uuid))',
        FilterExpression: '((#firstGroupedFilter_first = :firstGroupedFilter) OR (#secondGroupedFilter_second = :secondGroupedFilter))',
        ExpressionAttributeValues: {
          ':userId': '123456',
          ':uuid': '123-123-123',
          ':firstGroupedFilter': 'one',
          ':secondGroupedFilter': 'two',
        },
        ExpressionAttributeNames: {
          '#userId': 'userId',
          '#uuid': 'uuid',
          '#firstGroupedFilter_first': 'first',
          '#secondGroupedFilter_second': 'second',
        },
        ExclusiveStartKey: pk,
        Select: 'ALL_ATTRIBUTES',
        TableName: 'fake',
        Limit: 10,
        ScanIndexForward: true,
      });
    })
    .catch(err => expect(err).toBeUndefined())
    .then(() => {
      exciterAllowReject.dynamo.query.restore();
      done();
    });
});

test('querySort', (done) => {
  expect.assertions(4);
  const pk = {
    userId: '123456',
    uuid: '123-123-123',
  };
  const expected = { expected: 'thing', Items: [{ one: 'one' }, { two: 'two' }] };
  const stub = sinon.stub(exciterAllowReject.dynamo, 'query').callsFake(awsPromiseResolve(expected));
  const combos = [
    [true, false],
    [false, true],
    [true, true],
    [false, false],
  ];
  const testCombos = combos.map((combo) => {
    const query = {
      pageForward: combo[0],
      sortAscending: combo[1],
    };
    return exciterAllowReject.query(pk, 'fake', query)
      .then((res) => {
        expect(res.Items[0]).toEqual(expected.Items[query.pageForward ? 0 : 1]);
        sinon.assert.calledWith(stub, {
          KeyConditionExpression: '((#userId = :userId) AND (#uuid = :uuid))',
          ExpressionAttributeValues: {
            ':userId': '123456',
            ':uuid': '123-123-123',
          },
          ExpressionAttributeNames: {
            '#userId': 'userId',
            '#uuid': 'uuid',
          },
          TableName: 'fake',
          Limit: 10,
          // The sortAscending parameter should essentially reverse the
          // pageForward param.
          ScanIndexForward: query.sortAscending ? query.pageForward : !query.pageForward,
        });
      });
  });

  return Promise.all(testCombos)
    .catch(err => expect(err).toBeUndefined())
    .then(() => {
      exciterAllowReject.dynamo.query.restore();
      done();
    });
});

test('queryLastPageForward', (done) => {
  expect.assertions(2);
  const pk = {
    userId: '123456',
  };
  // What the response from dynamo would be if you had paged forward to the
  // last page.
  const dynamoResponseForward = {
    Items: [
      { one: 'one' },
      { two: 'two' },
      { three: 'three' },
      { four: 'four' },
      { five: 'five' },
    ],
    LastEvaluatedKey: { shouldBe: 'deleted' },
  };
  const dynamoResponseReversed = {
    Items: [
      { five: 'five' },
      { four: 'four' },
      { three: 'three' },
      { two: 'two' },
      { one: 'one' },
    ],
    LastEvaluatedKey: { shouldBe: 'deleted' },
  };
  const query = { startKey: 'last', limit: 5 };
  sinon.stub(exciterAllowReject.dynamo, 'query').callsFake(awsPromiseResolve(dynamoResponseReversed));
  sinon.stub(exciterAllowReject, 'getTotalCount').resolves(103);
  return exciterAllowReject.query(pk, 'fake', query)
    .then((res) => {
      expect(res.Items).toEqual(dynamoResponseForward.Items.slice(2));
      expect(res.LastEvaluatedKey).toBeUndefined();
    })
    .catch(err => expect(err).toBeUndefined())
    .then(() => {
      exciterAllowReject.dynamo.query.restore();
      exciterAllowReject.getTotalCount.restore();
      done();
    });
});

test('queryLastPageBackwards', (done) => {
  expect.assertions(2);
  const pk = {
    userId: '123456',
  };
  // What the response from dynamo would be if you had paged backward to the
  // last page.
  const dynamoResponseReversed = {
    Items: [
      { five: 'five' },
      { four: 'four' },
      { three: 'three' },
      { two: 'two' },
      { one: 'one' },
    ],
    LastEvaluatedKey: { shouldBe: 'deleted' },
  };
  const dynamoResponseForward = {
    Items: [
      { one: 'one' },
      { two: 'two' },
      { three: 'three' },
      { four: 'four' },
      { five: 'five' },
    ],
    LastEvaluatedKey: { shouldBe: 'deleted' },
  };
  const query = { startKey: 'last', limit: 5, pageForward: false };
  sinon.stub(exciterAllowReject.dynamo, 'query').callsFake(awsPromiseResolve(dynamoResponseForward));
  sinon.stub(exciterAllowReject, 'getTotalCount').resolves(103);

  return exciterAllowReject.query(pk, 'fake', query)
    .then((res) => {
      expect(res.Items).toEqual([].concat(dynamoResponseReversed.Items.slice(2)));
      expect(res.LastEvaluatedKey).toBeUndefined();
    })
    .catch(err => expect(err).toBeUndefined())
    .then(() => {
      exciterAllowReject.dynamo.query.restore();
      exciterAllowReject.getTotalCount.restore();
      done();
    });
});

test('queryKitchenSink', (done) => {
  expect.assertions(1);
  const pk = {
    userId: '123456',
    uuid: '123-123-123',
  };
  const filters = {
    emptyGroup: {
      group: {
        conjunction: 'AND',
      },
    },
    andGroup: {
      group: {
        conjunction: 'OR',
      },
    },
    firstGroupedFilter: {
      condition: {
        path: 'first',
        value: 'one',
        memberOf: 'andGroup',
      },
    },
    secondGroupedFilter: {
      condition: {
        path: 'second',
        value: 'two',
        memberOf: 'andGroup',
      },
    },
    someFilter: {
      condition: {
        path: 'some',
        value: 'filter',
        operator: '<',
      },
    },
    nestedFilter: {
      condition: {
        path: 'some.nested.thing',
        value: 'egg',
      },
    },
  };
  const expected = { expected: 'thing' };
  const dynamoQuery = {
    startKey: pk,
    rawFilters: filters,
    select: 'ALL_ATTRIBUTES',
    includeTotal: true,
    index: 'sorted-index',
  };
  const stub = sinon.stub(exciterAllowReject.dynamo, 'query').callsFake(awsPromiseResolve(expected));
  sinon.stub(exciterAllowReject, 'getTotalCount').resolves(100);
  return exciterAllowReject.query(pk, 'fake', dynamoQuery)
    .then((res) => {
      expected.totalCount = 100;
      expect(res).toEqual(expected);
      sinon.assert.calledWith(stub, {
        KeyConditionExpression: '((#userId = :userId) AND (#uuid = :uuid))',
        FilterExpression: '((#firstGroupedFilter_first = :firstGroupedFilter) OR (#secondGroupedFilter_second = :secondGroupedFilter)) AND ((#someFilter_some < :someFilter) AND (#nestedFilter_some.#nestedFilter_nested.#nestedFilter_thing = :nestedFilter))',
        ExpressionAttributeValues: {
          ':userId': '123456',
          ':uuid': '123-123-123',
          ':someFilter': 'filter',
          ':nestedFilter': 'egg',
          ':firstGroupedFilter': 'one',
          ':secondGroupedFilter': 'two',
        },
        ExpressionAttributeNames: {
          '#userId': 'userId',
          '#uuid': 'uuid',
          '#firstGroupedFilter_first': 'first',
          '#secondGroupedFilter_second': 'second',
          '#someFilter_some': 'some',
          '#nestedFilter_some': 'some',
          '#nestedFilter_nested': 'nested',
          '#nestedFilter_thing': 'thing',
        },
        ExclusiveStartKey: pk,
        Select: 'ALL_ATTRIBUTES',
        TableName: 'fake',
        IndexName: 'sorted-index',
        Limit: 10,
        ScanIndexForward: true,
      });
    })
    .catch(err => expect(err).toBeUndefined())
    .then(() => {
      exciterAllowReject.dynamo.query.restore();
      exciterAllowReject.getTotalCount.restore();
      done();
    });
});

test('normalizeGroup', (done) => {
  expect.assertions(1);
  const data = [
    ['defaultConjunction', {}],
    ['andConjunction', { conjunction: 'AND' }],
    ['orConjunction', { conjunction: 'OR' }],
  ];
  const expected = [
    { name: 'defaultConjunction', conjunction: 'AND' },
    { name: 'andConjunction', conjunction: 'AND' },
    { name: 'orConjunction', conjunction: 'OR' },
  ];
  const res = data.map(args => Exciter.normalizeGroup(args[1], args[0]));
  expect(res).toEqual(expected);
  done();
});

test('normalizeGroupUnsupported', (done) => {
  expect.assertions(1);
  try {
    Exciter.normalizeGroup({ conjunction: 'junctionwhatsyourfunction' }, 'unsupportedConjunction');
  }
  catch (err) {
    expect(err.message).toEqual('Unsupported group conjunction: junctionwhatsyourfunction. Allowed conjunctions: AND, OR.');
    done();
  }
});

test('normalizeDataValues', (done) => {
  expect.assertions(1);
  const data = {
    id: '123',
    attributes: {
      userId: '345',
      nestedMap: { someOther: 'thing' },
    },
    skipMe: undefined,
  };
  const expected = [
    { name: 'id', value: '123' },
    { name: 'attributes', value: { userId: '345', nestedMap: { someOther: 'thing' } } },
  ];
  expect(Exciter.normalizeDataValues(data)).toEqual(expected);
  done();
});

test('normalizeExpressionAttribute', (done) => {
  expect.assertions(1);
  const data = {
    some: 'simple value',
    someOther: {
      value: 'more complex value',
    },
  };
  const expected = [
    { name: 'some', value: 'simple value' },
    { name: 'someOther', value: 'more complex value' },
  ];
  const res = Object.keys(data)
    .map(name => Exciter.normalizeExpressionAttribute(data[name], name));
  expect(res).toEqual(expected);
  done();
});

test('normalizeExpressionAttributeNoName', (done) => {
  expect.assertions(1);
  try {
    Exciter.normalizeExpressionAttribute({});
  }
  catch (err) {
    expect(err.message).toEqual('Attribute is missing a name.');
  }
  done();
});

test('normalizeExpressionAttributeNoValue', (done) => {
  expect.assertions(2);
  try {
    Exciter.normalizeExpressionAttribute(undefined, 'nullValueSimple');
  }
  catch (err) {
    expect(err.message).toEqual('Attribute "nullValueSimple" is missing a value.');
  }
  try {
    Exciter.normalizeExpressionAttribute({ value: undefined }, 'nullValueObject');
  }
  catch (err) {
    expect(err.message).toEqual('Attribute "nullValueObject" is missing a value.');
  }
  done();
});

test('normalizeCondition', (done) => {
  expect.assertions(1);
  const data = [
    ['defaultOperator', { value: 'equals' }],
    ['allProps', { name: 'overriddenName', path: 'nested.value', operator: 'between', value: [1, 2, 3], memberOf: 'someGroup', negate: 1 }],
    ['disallowedProps', { you: 'cannot', see: 'any of', these: 'properties', value: 'you can see me' }],
  ];
  const expected = [
    { name: 'defaultOperator', value: 'equals', operator: '=' },
    { name: 'overriddenName', path: 'nested.value', operator: 'between', value: [1, 2, 3], memberOf: 'someGroup', negate: 1 },
    { name: 'disallowedProps', value: 'you can see me', operator: '=' },
  ];
  const res = data.map(args => Exciter.normalizeCondition(args[1], args[0]));
  expect(res).toEqual(expected);
  done();
});

test('buildConditionExpressionSimple', (done) => {
  expect.assertions(1);
  const data = ['=', '<', '>', '<=', '>=', '!=', 'contains', 'startswith'].map(op => ({
    name: `prop${op}`,
    operator: op,
    value: 'value',
  }));
  let expected = [
    '(#prop= = :prop=)',
    '(#prop< < :prop<)',
    '(#prop> > :prop>)',
    '(#prop<= <= :prop<=)',
    '(#prop>= >= :prop>=)',
    '(NOT #prop!= = :prop!=)',
    '(contains(#propcontains, :propcontains))',
    '(begins_with(#propstartswith, :propstartswith))',
  ].join(' AND ');
  expected = `(${expected})`;
  const expression = Exciter.buildConditionExpression(data);
  expect(expression).toEqual(expected);
  done();
});

test('buildConditionExpressionArray', (done) => {
  expect.assertions(2);
  const data = ['in', 'notin', 'between'].map(op => ({
    name: `prop${op}`,
    operator: op,
    value: ['one', 'two'],
  }));
  let expected = [
    '(#propin IN (:propin0, :propin1))',
    '(NOT #propnotin IN (:propnotin0, :propnotin1))',
    '(#propbetween BETWEEN :propbetween0 AND :propbetween1)',
  ].join(' OR ');
  expected = `(${expected})`;
  const expression = Exciter.buildConditionExpression(data, 'OR');
  expect(expression).toEqual(expected);

  const bad = [
    { name: 'bad', operator: 'in', value: 'I\'m not an array!' },
  ];
  try {
    Exciter.buildConditionExpression(bad);
  }
  catch (err) {
    expect(err.message).toEqual('Value must be an array when using the "in" operator.');
    done();
  }
});

test('buildConditionExpressionExists', (done) => {
  expect.assertions(1);
  const data = [
    {
      name: 'yup',
      path: 'does.exist',
      operator: 'exists',
      value: 1,
    },
    {
      name: 'nope',
      path: 'does.not.exist',
      operator: 'exists',
      value: 0,
    },
  ];
  const expected = '((attribute_exists(#yup_does.#yup_exist)) AND (attribute_not_exists(#nope_does.#nope_not.#nope_exist)))';
  const expression = Exciter.buildConditionExpression(data);
  expect(expression).toEqual(expected);
  done();
});

test('buildConditionExpressionBadOperator', (done) => {
  expect.assertions(1);
  try {
    Exciter.buildConditionExpression([{ name: 'bad', operator: 'bad', value: 'bad' }]);
  }
  catch (err) {
    expect(err.message).toEqual('Unsupported operator: bad');
    done();
  }
});

test('buildConditionExpressionNegate', (done) => {
  expect.assertions(1);
  const expected = '(NOT #negated = :negated)';
  const expression = Exciter.buildConditionExpression([{ name: 'negated', operator: '=', value: 'thisisnottrue', negate: true }]);
  expect(expression).toEqual(expected);
  done();
});

test('getTotalCount', (done) => {
  expect.assertions(4);
  const expected = {
    Count: 15,
    LastEvaluatedKey: {
      userId: '12345',
      uuid: '123-123-123',
    },
  };
  const queryParams = {
    Select: 'COUNT',
    ExclusiveStartKey: {
      userId: '12345',
      uuid: '123-123-123',
    },
    Limit: 10,
  };
  let called = 0;
  sinon.stub(exciterAllowReject.dynamo, 'query').callsFake((params) => {
    called += 1;
    if (called === 1) {
      expect(params).toEqual(_.omit(queryParams, ['Limit', 'ExclusiveStartKey']));
    }
    else {
      expect(params).toEqual(_.omit(queryParams, ['Limit']));
      delete expected.LastEvaluatedKey;
    }
    return {
      promise: () => Promise.resolve(expected),
    };
  });

  return exciterAllowReject.getTotalCount(_.omit(queryParams, ['Select']))
  .then((total) => {
    expect(total).toEqual(30);
    expect(called).toEqual(2);
  })
  .catch(err => expect(err).toBeUndefined())
  .then(() => {
    exciterAllowReject.dynamo.query.restore();
    done();
  });
});

test('valueIsEmpty', (done) => {
  expect.assertions(8);

  // Things that aren't empty.
  expect(Exciter.valueIsEmpty(1)).toBe(false);
  expect(Exciter.valueIsEmpty('not empty')).toBe(false);
  expect(Exciter.valueIsEmpty([1, 2])).toBe(false);
  expect(Exciter.valueIsEmpty({ not: 'empty' })).toBe(false);
  expect(Exciter.valueIsEmpty(null)).toBe(false);

  // Things that are empty.
  expect(Exciter.valueIsEmpty(undefined)).toBe(true);
  expect(Exciter.valueIsEmpty('')).toBe(true);
  expect(Exciter.valueIsEmpty([])).toBe(true);
  done();
});
