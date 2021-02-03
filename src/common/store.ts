/* eslint-disable */

import { action, observable } from "mobx";
import { MobxDomainStoreMutable, MobxStoreMutable } from "../packages/default-store";

// #region [Group] Stores

export class RootStore extends MobxStoreMutable<RootStore> {
	projectDataStore = new ProjectDataStore(this);
}

export class ProjectDataStore extends MobxDomainStoreMutable<ProjectDataStore, RootStore> {
	private internalColumns: ProjectColumn[] = [];
	private internalProjects: Project[] = [];

	private activeFilters: ProjectDataFilters = {groups: [], columns: [], assignees: []};

	@observable assignees: string[] = [];
	@observable views: ProjectDataView[] = [];
	@observable columns: ProjectColumn[] = [];
	@observable groups: ProjectGroup[] = [];
	@observable projects: ProjectType[] = [];
	@observable sections: ProjectCrossSection[] = [];
	@observable selectedView: ProjectDataView | null = null;

	@observable update: boolean = false;

	sectionElements: HTMLDivElement[] = [];
	sectionPositions: DOMRect[] = [];

	constructor(rootStore: RootStore) {
		super(rootStore);

		this.loadProjectData();
	}

	@action
	private updateProjects() {
		this.projects = this.internalProjects.filter(project =>
			(
				this.activeFilters.columns.length === 0 ||
				this.activeFilters.columns.some((column) => project.placement.column === column)
			)
			&&
			(
				this.activeFilters.groups.length === 0 ||
				this.activeFilters.groups.some((group) => project.placement.group === group)
			)
			&&
			(
				this.activeFilters.assignees.length === 0 ||
				this.activeFilters.assignees.includes(project.assignee)
			)
		);
	}

	getContainerByName<T extends 'column' | 'group'>(type: T, name: string): ProjectContainerType<T>[] {
		const containers = type === 'column' ? this.columns : this.groups;

		return containers.filter(container => container.name === name) as ProjectContainerType<T>[];
	}

	getProjects(container: ProjectContainer) {
		return (
			container instanceof ProjectColumn ?
			this.projects.filter(project => project.placement.column === container) :
			this.projects.filter(project => project.placement.group === container)
		);
	}

	@action setProjectView(projectView: ProjectDataView) {
		this.selectedView = projectView;

		this.columns = this.selectedView.columns;
	}

	@action addFilter(filter: ProjectDataFilter) {
		if (filter.column) this.activeFilters.columns.push(filter.column);
		if (filter.group) this.activeFilters.groups.push(filter.group);
		if (filter.assignee) this.activeFilters.assignees.push(filter.assignee);

		this.updateProjects();
	}

	@action removeFilter(filter: ProjectDataFilter) {
		if (filter.column) this.activeFilters.columns.splice(this.activeFilters.columns.indexOf(filter.column), 1);
		if (filter.group) this.activeFilters.groups.splice(this.activeFilters.groups.indexOf(filter.group), 1);
		if (filter.assignee) this.activeFilters.assignees.splice(this.activeFilters.assignees.indexOf(filter.assignee), 1);

		this.updateProjects();
	}

	@action forceUpdate() {
		this.sectionPositions = [];

		this.update = !this.update;
	}

	@action movePlaceholder(placeholder: ProjectPlaceholder, position: Project | 'remove', below?: boolean) {
		if (position !== 'remove') {
			if (!this.projects.includes(placeholder)) {
				this.projects.push(placeholder);

				console.log('Placeholder added');
			} else {
				console.log('Placeholder moved');
			}

			placeholder.section?.removeProject(placeholder);
			position.section?.addProject(placeholder, position, below);
		} else {
			if (this.projects.includes(placeholder)) {
				placeholder.section?.removeProject(placeholder);
				this.projects.splice(this.projects.indexOf(placeholder), 1);

				console.log('Placeholder removed');
			}
		}

		this.forceUpdate();
	}

	@action moveProject(project: Project, position: ProjectType) {
		project.section?.removeProject(project);
		position.section?.addProject(project, position, true);

		this.forceUpdate();
	}

	@action loadProjectData = () => {
		this.assignees = [
			'Robert Impellitteri',
			'Adam Mazzarella',
			'John Dale',
			'Jane Doe'
		];

		this.internalColumns = [
			new ProjectColumn('Requested'),
			new ProjectColumn('Accepted'),
			new ProjectColumn('Active'),
			new ProjectColumn('Finished'),
			new ProjectColumn('Deployed'),
		];

		this.groups = [
			new ProjectGroup('Expedite'),
			new ProjectGroup('Everything Else'),
		];

		this.views = [
			new ProjectDataView('Requests', [this.internalColumns[0], this.internalColumns[1]], [...this.groups]),
			new ProjectDataView('Overview', [this.internalColumns[1], this.internalColumns[2], this.internalColumns[3]], [...this.groups]),
			new ProjectDataView('Completed', [this.internalColumns[3], this.internalColumns[4]], [...this.groups]),
		];

		this.internalProjects = [
			new Project('Project 1, Accepted, Expedite', this.assignees[0], {column: this.internalColumns[1], group: this.groups[0]}),
			new Project('Project 2, Accepted, Expedite', this.assignees[0], {column: this.internalColumns[1], group: this.groups[0]}),

			new Project('Project 3, Accepted, Unsorted', this.assignees[0], {column: this.internalColumns[1], group: this.groups[1]}),
			new Project('Project 4, Accepted, Unsorted', this.assignees[0], {column: this.internalColumns[1], group: this.groups[1]}),

			new Project('Project 5, Active, Expedite', this.assignees[1], {column: this.internalColumns[2], group: this.groups[0]}),
			new Project('Project 6, Active, Expedite', this.assignees[1], {column: this.internalColumns[2], group: this.groups[0]}),

			new Project('Project 7, Active, Unsorted', this.assignees[2], {column: this.internalColumns[2], group: this.groups[1]}),
			new Project('Project 8, Active, Unsorted', this.assignees[2], {column: this.internalColumns[2], group: this.groups[1]}),

			new Project('Project 9, Finished, Expedite', this.assignees[3], {column: this.internalColumns[3], group: this.groups[0]}),
			new Project('Project 10, Finished, Expedite', this.assignees[3], {column: this.internalColumns[3], group: this.groups[0]}),

			new Project('Project 11, Finished, Unsorted', this.assignees[0], {column: this.internalColumns[3], group: this.groups[1]}),
			new Project('Project 12, Finished, Unsorted', this.assignees[0], {column: this.internalColumns[3], group: this.groups[1]}),
		];

		this.setProjectView(this.views[1]);

		// Set all of the container projectDataStore's to this
		[...this.internalColumns, ...this.groups].forEach(container => container.projectDataStore = this);

		this.updateProjects();

		// Create sections
		this.internalColumns.forEach(column => this.groups.forEach(group => this.sections.push(new ProjectCrossSection(this, {column, group}))));

		// Link sections to groups
		this.sections.forEach(section => section.placement.group.sections.push(section));
	}
}

// #endregion

// #region [Group] Project Data

type ProjectContainerType<T> = T extends 'column' ? ProjectColumn : T extends 'group' ? ProjectGroup : never;

export type ProjectType = Project | ProjectPlaceholder;

interface ProjectDataFilters {
	groups: ProjectGroup[];
	columns: ProjectColumn[];
	assignees: string[];
}

interface ProjectDataFilter {
	group?: ProjectGroup;
	column?: ProjectColumn;
	assignee?: string;
}

class ProjectDataView {
	constructor(
		public name: string,
		public columns: ProjectColumn[],
		public groups: ProjectGroup[]
	) {}
}

abstract class ProjectContainer {
	projectDataStore: ProjectDataStore | null = null;
	sections: ProjectCrossSection[] = [];

	constructor(
		public name: string
	) {}

	// get projects(): ProjectType[] {
	// 	return this.projectDataStore?.projects.filter(
	// 		project =>
	// 		(
	// 			this instanceof ProjectColumn &&
	// 			project.placement.column === this
	// 		) ||
	// 		(
	// 			this instanceof ProjectGroup &&
	// 			project.placement.group === this
	// 		)
	// 	) ?? [];
	// }

	// addProject(project: ProjectType, options: {index?: number, container?: ProjectContainer}) {
	// 	if (this instanceof ProjectColumn) {
	// 		project.placement.column = this;
	// 		if (options.container && options.container instanceof ProjectGroup) project.placement.group = options.container;

	// 		console.log('This is the INDEX 2', options.index);

	// 		if (options.index !== undefined) {
	// 			this.projects.forEach(columnProject => {
	// 				if ((columnProject.index !== null && options.index !== undefined) && (columnProject.index >= options.index)) columnProject.index++;
	// 			});

	// 			project.index = options.index;
	// 		} else {
	// 			// This is 2 because we want 1 less than the length and the render already adds 1 to index's
	// 			console.log('Index before:', project.index);
	// 			project.index = this.projects.length - 2;
	// 			console.log('Index after:', project.index);
	// 		}
	// 	} else if (this instanceof ProjectGroup) {
	// 		project.placement.group = this;
	// 		if (options.container && options.container instanceof ProjectColumn) project.placement.column = options.container;
	// 	}
	// }

	// removeProject(project: ProjectType) {
	// 	if (this instanceof ProjectColumn && project.placement.column === this) {
	// 		const index = project.index;

	// 		console.log(index);

	// 		this.projects.forEach(project => {
	// 			console.log(project.index);

	// 			if ((project.index !== null && index !== null) && (project.index > index)) project.index--;
	// 		});
	// 	}
	// }
}

export class ProjectColumn extends ProjectContainer {}

export class ProjectGroup extends ProjectContainer {}

export class ProjectCrossSection {
	constructor(
		public projectDataStore: ProjectDataStore,
		public placement: {
			column: ProjectColumn;
			group: ProjectGroup;
		}
	) {
		let index = 0;

		this.projectDataStore.projects.filter(project => {
			if (
				this.placement &&
				project.placement.column === this.placement.column &&
				project.placement.group === this.placement.group
			) {
				project.index = index;
				project.section = this;
				index++;

				return true;
			}

			return false;
		});
	}

	getProjects(callback?: (project: ProjectType, index: number) => void): ProjectType[] {
		let index = 0;

		return this.projectDataStore.projects.filter(project => {
			if (
				project.section === this
			) {
				if (callback) callback(project, index);
				index++;

				return true;
			}

			return false;
		});
	}

	addProject(project: ProjectType, position?: ProjectType, below?: boolean) {
		let positionIndex = (position && position.index !== null) ? position.index + (below ? 1 : 0) : null;

		const projects = this.getProjects(sectionProject => {
			if ((sectionProject.index !== null && positionIndex !== null) && sectionProject.index >= positionIndex) sectionProject.index++;
		});

		if (positionIndex === null) {
			positionIndex = projects.length + (projects.includes(project) ? -1 : 0);

			console.log(`Switching to push because [${position === undefined ? 'position is undefined' : position.index === null ? 'position index is null' : 'unknown'}]`);
		}

		project.index = positionIndex;
		project.placement = this.placement;
		project.section = this;
	}

	removeProject(project: ProjectType) {
		this.getProjects(sectionProject => {
			if ((sectionProject.index !== null && project.index !== null) && sectionProject.index > project.index) sectionProject.index--;
		});
	}
}

export class Project {
	index: number | null = null;
	position: [number, number] | null = null;
	section: ProjectCrossSection | null = null;

	constructor(
		public title: string,
		public assignee: string,
		public placement: {
			column: ProjectColumn,
			group: ProjectGroup
		}
	) {}
}

export class ProjectPlaceholder {
	index: number | null = null;
	height: number | null = null;

	constructor(
		public placement: {
			column: ProjectColumn,
			group: ProjectGroup
		},
		public section: ProjectCrossSection | null
	) {}
}

// #endregion
