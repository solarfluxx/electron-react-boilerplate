/* eslint-disable */

// export class TaskDataPacket {
// 	columns: TaskColumnPacket[];
// 	filteredColumns: TaskColumnPacket[] = [];

// 	filters: TaskDataFilters = {
// 		groups: []
// 	};

// 	constructor(...columns: TaskColumnPacket[]) {
// 		this.columns = columns;
// 	}

// 	setColumns(columns: TaskColumnPacket[]) {
// 		this.columns = columns;
// 	}

// 	addColumn(column: TaskColumnPacket, index?: number) {
// 		if (index === undefined) this.columns.push(column);
// 		else this.columns.splice(index, 0, column);
// 	}

// 	mapGroups(callback: (group: TaskGroupPacket, index: number) => JSX.Element) {
// 		let data: {[group: string]: TaskGroupPacket} = {};
// 		let taskGroups: JSX.Element[] = [];

// 		this.columns.forEach(column =>
// 			column.groups.forEach(group =>
// 				data[group.name] = group
// 			)
// 		);

// 		Object.entries(data).forEach((group, index) => {
// 			taskGroups.push(callback(group[1], index));
// 		});

// 		return taskGroups;
// 	}
// }

// export class TaskColumnPacket {
// 	tasks: TaskPacket[] = [];

// 	constructor(
// 		public name: string,
// 		public groups: TaskGroupPacket[]
// 	) {
// 		groups.forEach(group => this.tasks.push(...group.getColumnTasks(this)));
// 	}

// 	getTasks(group: TaskGroupPacket) {
// 		let validTasks: TaskPacket[] = [];
// 		this.tasks.forEach(task => task.group === group && validTasks.push(task));

// 		return validTasks;
// 	}
// }

// export class TaskPacket {
// 	group: TaskGroupPacket | null = null;
// 	column: TaskColumnPacket | null = null;

// 	constructor(
// 		public title: string
// 	) {}
// }

// export class TaskGroupPacket {
// 	columns: TaskColumnPacket[] = [];

// 	tasks: TaskPacket[] = [];
// 	private internalTasks: TaskPacket[] = [];

// 	constructor(
// 		public name: string
// 	) {}

// 	addTasks(...tasks: TaskPacket[]) {
// 		this.internalTasks = tasks;

// 		return this;
// 	}

// 	getColumnTasks(column: TaskColumnPacket) {
// 		const internalTasks = this.internalTasks;
// 		this.columns.push(column);

// 		this.internalTasks.forEach(task => {task.group = this; task.column = column;});
// 		this.tasks.push(...this.internalTasks);

// 		this.internalTasks = [];
// 		return internalTasks;
// 	}
// }
