import { showTask } from './index';
import {
    createClient as CreateClient,
    defaultExchanges,
    subscriptionExchange,
} from '@urql/core';
import { SubscriptionClient } from 'subscriptions-transport-ws';
import { pipe, subscribe } from 'wonka';

async function fetchGraphQL(operationsDoc, operationName, variables) {
    const result = await fetch(`https://${process.env.REFERENCE}`, {
        headers: headers(),
        method: 'POST',
        body: JSON.stringify({
            query: operationsDoc,
            variables,
            operationName,
        }),
    });
    return result.json();
}

const operationsDoc = `
query GetTable {
  TODO_TASK(order_by: { ID: asc }) {
    ID
    Task
    Date
    Completed
  }
}

mutation AddTask($Task: String) {
  insert_TODO_TASK(objects: {Task: $Task}) {
    affected_rows
  }
}

mutation DeleteTask($Task: String = "") {
  delete_TODO_TASK(where: {Task: {_eq: $Task}}) {
    affected_rows
  }
}

mutation CheckTask($Task: String = "", $Completed: Boolean) {
  update_TODO_TASK(where: {Task: {_eq: $Task}}, _set: {Completed: $Completed}) {
    affected_rows
  }
}

mutation SwapRow($Task1:String = "",$Completed1: Boolean,
$Task2:String = "", $Completed2: Boolean, $temp:String=""){
  first: update_TODO_TASK(where:
  {Task: {_eq: $Task1}}, _set: {Task: $temp, Completed: $Completed2})
  {
    affected_rows
  }

  second: update_TODO_TASK(where:
        {Task: {_eq: $Task2}},
            _set: {Task: $Task1, Completed: $Completed1}) {
                   affected_rows
                                                            }
  third:update_TODO_TASK(where:
        {Task: {_eq: $temp}},
            _set: {Task: $Task2, Completed: $Completed2}) {
                   affected_rows
                                                            }
}
`;

const subscription = `subscription Subscription {
		TODO_TASK(order_by: { ID: asc }) {
    ID
    Task
    Date
    Completed
  }
}`;

export function subscribeChange() {
    const subClient = new SubscriptionClient(`wss://${process.env.REFERENCE}`, {
        reconnect: true,
        connectionParams: {
            headers: headers(),
        },
    });

    const client = new CreateClient({
        url: `https://${process.env.REFERENCE}`,
        fetchOptions: () => ({
            headers: headers(),
        }),
        exchanges: [
            ...defaultExchanges,
            subscriptionExchange({
                forwardSubscription: operation => subClient.request(operation),
            }),
        ],
    });

    pipe(
        client.subscription(subscription),
        subscribe(result => {
            showTask(result.data);
        }),
    );
}

function executeMyMutation(request, variable) {
    return fetchGraphQL(operationsDoc, request, variable);
}

export async function toGraphQL(request, variable) {
    const { data } = await executeMyMutation(request, variable);

    return data;
}

function headers() {
    return {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': `${process.env.PASSWORD}`,
    };
}
