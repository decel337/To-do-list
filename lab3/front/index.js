import { toGraphQL, subscribeChange } from './gql.js';
import './loading.gif';
import './style.css';
//import * as sanitize from 'sanitize-html';

const form = document.getElementById('form');
const alert = document.getElementById('alert');
const reg = /^\s*$/;
form.addEventListener('submit', addTask);
form.parentElement.classList.add('_sending');

const errorHandle = res => {
    if (res && res[0]?.message) {
        catchError(res[0]);
    }
};

function outputTask(table) {
    const ul = document.querySelector('ul.todos');
    form.elements['input'].classList.remove('_error');
    while (ul.firstChild) {
        ul.removeChild(ul.lastChild);
    }
    for (const task in table) {
        const li = document.createElement('li');
        li.draggable = true;
        const textSpan = document.createElement('span');
        textSpan.classList.add('todo-text');
        const newTodo = table[task].Task;
        textSpan.append(newTodo);

        const deleteBtn = document.createElement('span');
        deleteBtn.classList.add('closetask');
        const txt = document.createTextNode('\u00D7');
        deleteBtn.appendChild(txt);

        ul.appendChild(li).append(textSpan);
        ul.appendChild(li).append(deleteBtn);

        deleteTask(deleteBtn);
        checked(textSpan);

        if (table[task].Completed === true) {
            textSpan.classList.add('_checked');
        }
    }
}

function inputValidate(str) {
    let res = true;

    const ul = document.querySelector('ul.todos');

    res = !Array.from(ul.children).some(
        li => li.childNodes[0]?.textContent === str,
    );

    if (reg.test(str)) {
        res = false;
    }

    if (!res) {
        form.elements['input'].classList.add('_error');
    }

    return res;
}

async function addTask(e) {
    e.preventDefault();
    const input = form.elements['input'];

    if (!inputValidate(input.value)) {
        return;
    }

    form.parentElement.classList.add('_sending');
    toGraphQL('AddTask', { Task: input.value }).then(errorHandle);
    input.value = '';
}

export function showTask() {
    toGraphQL('GetTable', {}).then(data => {
        form.parentElement.classList.remove('_sending');
        if (!data || data[0]?.message) {
            catchError(data[0]);
            return;
        }

        outputTask(data.TODO_TASK);

        for (const ul of form.children[4].childNodes) {
            ul.addEventListener('mousedown', dragAndDrop);
        }
    });
}

try {
    subscribeChange();
} catch (error) {
    catchError(error);
}

/*SubscribeChange().then(result => {
    if (result.error) {
        CatchError(result.error);
    }
    form.parentElement.classList.remove('_sending');
});*/

function deleteTask(element) {
    element.addEventListener('click', event => {
        form.parentElement.classList.add('_sending');
        toGraphQL('DeleteTask', {
            Task: element.parentElement.childNodes[0]?.textContent,
        }).then(errorHandle);
        event.stopPropagation();
    });
}

function checked(element) {
    element.addEventListener('click', event => {
        form.parentElement.classList.add('_sending');
        toGraphQL('CheckTask', {
            Task: element.parentElement.childNodes[0]?.textContent,
            Completed: !isComplete(element),
        }).then(errorHandle);
        event.stopPropagation();
    });
}

function dragAndDrop() {
    const task = this;
    let lastEnter;
    const elements = document.querySelector('ul.todos').children;
    const DragStart = function () {
        setTimeout(() => {
            this.classList.add('_hidden');
        }, 0);
    };

    const DragEnd = function () {
        this.classList.remove('_hidden');
    };

    const DragOver = function (e) {
        e.preventDefault();
    };
    const DragEnter = function (e) {
        e.preventDefault();
        lastEnter = e.target;
        this.classList.add('_pointed');
    };
    const DragLeave = function (e) {
        if (lastEnter === e.target) {
            this.classList.remove('_pointed');
        }
    };
    async function DragDrop() {
        form.parentElement.classList.add('_sending');

        toGraphQL('SwapRow', {
            Task1: this.childNodes[0]?.textContent,
            Completed1: isComplete(this.childNodes[0]),
            Task2: task.childNodes[0]?.textContent,
            Completed2: isComplete(task.childNodes[0]),
            temp: process.env.TEMP,
        }).then(errorHandle);

        this.classList.remove('_pointed');
    }

    for (const elem of elements) {
        elem.addEventListener('dragover', DragOver);
        elem.addEventListener('dragenter', DragEnter);
        elem.addEventListener('dragleave', DragLeave);
        elem.addEventListener('drop', DragDrop);
    }

    task.addEventListener('dragstart', DragStart);
    task.addEventListener('dragend', DragEnd);
}

function isComplete(el) {
    return el.classList.contains('_checked');
}

export function catchError(errors) {
    clearAlert();
    if (
        !errors ||
        errors?.message !== 'hasura cloud limit of 60 requests/minute exceeded'
    ) {
        alertText('Unknown error. Please, wait.');
        alert.classList.add('_error');
        return;
    }
    alertText('Too many request. Please, wait.');
    alert.classList.add('_error');
    form.parentElement.classList.remove('_sending');
}

function alertText(str) {
    const labelText = document.getElementById('alert').children[1];
    labelText.textContent = str;
}
function clearAlert() {
    alert.className = 'alert';
}
