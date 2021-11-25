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

mutation SwapRow1($Task1:String = "", $Task2:String = "", $Completed2: Boolean){
  update_TODO_TASK(where:
  {Task: {_eq: $Task1}}, _set: {Task: $Task2, Completed: $Completed2})
  {
    returning {
      ID
    }
  }
}

mutation SwapRow2($Task1: String = "", $Completed1: Boolean,
                                        $Task2: String = "", $ID: Int) {
  update_TODO_TASK(where:
        {Task: {_eq: $Task2}, ID: {_neq: $ID}},
            _set: {Task: $Task1, Completed: $Completed1}) {
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
    const { errors, data } = await executeMyMutation(request, variable);

    if (errors) {
        // handle those errors like a pro
        return errors;
    }

    return data;
    // do something great with this precious data
}

export async function swap(variable) {
    const temp = variable.Completed1;
    delete variable.Completed1;

    const { errors, data } = await executeMyMutation('SwapRow1', variable);

    if (errors) {
        // handle those errors like a pro
        return errors;
    }

    // do something great with this precious data

    delete variable.Completed2;
    variable.Completed1 = temp;
    variable.ID = data.update_TODO_TASK.returning[0].ID;

    return swap1(variable);
}

async function swap1(variable) {
    console.log(variable);

    const { errors, data } = await executeMyMutation('SwapRow2', variable);

    if (errors) {
        // handle those errors like a pro
        return errors;
    }

    return data;
}

function headers() {
    return {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': `${process.env.PASSWORD}`,
    };
}
