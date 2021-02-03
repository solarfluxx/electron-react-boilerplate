/* eslint-disable */

import { css, cx } from '@emotion/css';
import { observer } from 'mobx-react';
import React from 'react';
import ReactDOM from 'react-dom';
import AppTheme from '../common/AppTheme';
import getBoundingClient from '../common/Util';
import * as Store from '../common/store';

// #region [Group] Other Components

export class Search extends React.Component {
	style = {
		container: css`
			padding: 8px;
			width: fit-content;

			border-radius: 4px;
			color: ${AppTheme.softText.get()};
			background-color: ${AppTheme.material.get()};
		`,
		input: css`
			border: none;
			background: none;
			outline: transparent;
		`
	};

	render() {
		return (
			<div className={this.style.container}>
				<input className={this.style.input} />
				<Icon name="search" right={true} />
			</div>
		);
	}
}

interface IconProps {
	name: string;
	right?: boolean;
	thick?: boolean;
	rotated?: boolean;

	onClick?: (event: React.MouseEvent<HTMLSpanElement, MouseEvent>) => void;
}

export class Icon extends React.Component<IconProps> {
	style = {
		container: css`
			float: ${this.props.right ? 'right' : 'left'};

			font-size: 18px;
			font-weight: ${this.props.thick ? 'bold' : 'normal'};

			&[props-clickable="true"] {
				cursor: pointer;
			}

			&[props-rotated="true"] {
				transform: rotateZ(-90deg);
			}
		`
	}

	render() {
		return (
			<span
				className={cx(this.style.container, 'material-icons')}
				onClick={this.props.onClick}
				{...{
					'props-clickable': (this.props.onClick !== undefined).toString(),
					'props-rotated': (this.props.rotated === true).toString(),
				}}

			>{this.props.name}</span>
		);
	}
}

// #endregion

// #region [Group] Project Components

interface ProjectContainerProps {
	projectDataStore: Store.ProjectDataStore; // {[group: string]: string[][]}
}

@observer
export class ProjectContainer extends React.Component<ProjectContainerProps> {
	style = {
		container: css`
			display: grid;

			grid-gap: 8px;
		`,
		categoryTitle: css`
			padding: 8px 12px;

			font-size: 14px;
			font-weight: 500;
			border-radius: 4px;
			text-transform: uppercase;
			color: ${AppTheme.softText.get()};
			background-color: ${AppTheme.material.get()};
		`,
	};

	render() {
		const projectData = this.props.projectDataStore;

		return (
			<div
				className={this.style.container}
				style={{
					// Set the grid columns to the amount of columns that will be displayed
					gridTemplateColumns: `repeat(${this.props.projectDataStore?.columns.length ?? 0}, 1fr)`
				}}
			>
				{
					projectData?.columns.map(
						(column, index) =>
						<div key={index} className={this.style.categoryTitle}>{column.name}</div>
					)
				}

				{
					projectData?.groups.map(
						(group, index) =>
						<ProjectGroup key={index} projectDataStore={this.props.projectDataStore} group={group} />
					)
				}
			</div>
		);
	}
}

interface ProjectGroupProps {
	projectDataStore: Store.ProjectDataStore;

	group: Store.ProjectGroup;
}

interface ProjectGroupState {
	isCollapsed: boolean;
}

@observer
export class ProjectGroup extends React.Component<ProjectGroupProps, ProjectGroupState> {
	state: ProjectGroupState = {isCollapsed: false};

	style = {
		container: css`
			display: grid;
			padding: 4px;

			row-gap: 8px;
			border-radius: 4px;
			grid-template-rows: min-content;
			background-color: ${AppTheme.material.get()};

			&[state-empty="true"] {
				position: relative;
			}
		`,
		name: css`
			padding: 8px 0;

			font-size: 15px;
			font-weight: 500;
			color: ${AppTheme.softText.get()};

			grid-column-start: 1;
			grid-column-end: 4;
		`,
		emptyText: css`
			position: absolute;
			display: flex;
			top: 0; left: 0; right: 0; bottom: 0;

			align-items: center;
			justify-content: center;
		`
	};

	// TODO: A new ref is created every time the ProjectGroup state updates meaning that I can't check for
	sectionRefs: React.RefObject<HTMLDivElement>[] = [];

	toggleState(collapsed?: boolean) {
		if (collapsed !== undefined) this.setState({isCollapsed: collapsed});
		else this.setState({isCollapsed: !this.state.isCollapsed});
	}

	calcSectionBounding() {
		this.sectionRefs.forEach(({current}) => {
			if (current) {
				const boundingClient = current.getBoundingClientRect();

				const included = this.props.projectDataStore.sectionElements.includes(current);

				console.log(included);

				if (included) {
					const index = this.props.projectDataStore.sectionElements.indexOf(current);

					this.props.projectDataStore.sectionPositions[index] = boundingClient;
				} else {
					this.props.projectDataStore.sectionElements.push(current);
					this.props.projectDataStore.sectionPositions.push(boundingClient);
				}
			}
		});
	}

	componentDidMount() {
		this.calcSectionBounding();
	}

	componentDidUpdate() {
		this.calcSectionBounding();
	}

	render() {
		// Make Mobx realize I'm using the projects array and update this state
		const forceUpdate = this.props.projectDataStore.update;

		const sections = this.props.group.sections.filter(section => this.props.projectDataStore.columns.some(column => section.placement.column === column));

		return (
			<>
				{
					<div className={this.style.name} style={{gridColumnEnd: this.props.projectDataStore.columns.length + 1 ?? 0}}>
						<Icon name="expand_more" onClick={() => this.toggleState()} rotated={this.state.isCollapsed} />
						{this.props.group.name}
					</div>
				}
				{
					!this.state.isCollapsed &&
					sections.map((section, index) => {
						const projects = section.getProjects();
						const empty = projects.length === 0;

						if (this.sectionRefs[index] === undefined) this.sectionRefs[index] = React.createRef<HTMLDivElement>();

						return (
							<div key={index} ref={this.sectionRefs[index]} className={this.style.container} {...{'state-empty': empty.toString()}}>
								{
									!empty ?
									projects.map(
										(project, index) =>
										<Project key={index} projectDataStore={this.props.projectDataStore} project={project} />
									) :
									<div className={this.style.emptyText}>Empty</div>
								}
							</div>
						)
					})
				}
			</>
		);
	}
}

interface ProjectProps {
	projectDataStore: Store.ProjectDataStore;

	project: Store.ProjectType;
}

interface ProjectState {
	offset: [number, number] | null;
}

class Project extends React.Component<ProjectProps, ProjectState> {
	state: ProjectState = {offset: null};

	style = {
		project: css`
			padding: 8px 12px;

			border-radius: 4px;
			box-sizing: border-box;
			color: ${AppTheme.titleText.get()};
			background-color: ${AppTheme.background.get()};
			box-shadow: 0px 2px 2px 0 ${AppTheme.shadowColor.get({opacity: 0.1})};

			&:first-child, &[state-grabbed="true"] {
				margin-top: 0;
			}

			&[state-grabbed="true"] {
				z-index: 2;
				margin-top: -8px;
			}
		`,
		container: css`
			position: relative;
		`,
		text: css`
			display: inline-block;
			user-select: text;
		`,
		content: css`
			margin-top: 16px;
		`,
		handle: css`
			position: absolute;
			top: 0; right: 0;

			cursor: grab;

			&:active {
				cursor: grabbing;
			}
		`,

		placeholder: css`
			border-radius: 4px;
			background-color: ${AppTheme.material.get({lightness: -10})};
		`
	};

	containerRef = React.createRef<HTMLDivElement>();
	dimensions: {
		width: number,
		height: number,
	} | null = null;
	position: {
		container: [number, number],
		grab: [number, number],
	} | null = null;
	closest: Store.Project | null = null;

	placeholder = new Store.ProjectPlaceholder(this.props.project.placement, this.props.project.section);

	render() {
		const height = this.dimensions?.height ? this.dimensions.height : ((this.props.project instanceof Store.ProjectPlaceholder && this.props.project.height) ? this.props.project.height : undefined);

		return (
			<div style={{gridRow: (this.props.project.index ?? 0) + 1}}>
				{
					(this.state.offset || this.props.project instanceof Store.ProjectPlaceholder) &&
					<div className={this.style.placeholder} style={{height: height}} />
				}

				{
					this.props.project instanceof Store.Project &&
					<div
						className={cx(this.style.project, 'project_element')}
						ref={this.containerRef}
						style={{
							position: this.state.offset ? 'absolute' : 'initial',
							top: ((this.state.offset && this.position?.container) ? this.position.container[1] + this.state.offset[1] : undefined),
							left: ((this.state.offset && this.position?.container) ? this.position.container[0] + this.state.offset[0] : undefined),
							width: ((this.dimensions) ? this.dimensions.width : undefined)
						}}

						{...{
							'state-grabbed': (this.state.offset !== null).toString()
						}}
					>
						<div className={this.style.container}>
							<div className={this.style.text}>{this.props.project.title}</div>

							<div className={cx(this.style.container, this.style.content)}>
								<div>{this.props.project.assignee}</div>

								<div className={this.style.handle} onMouseDown={this.onGrab}><Icon name="drag_handle" /></div>
							</div>
						</div>
					</div>
				}
			</div>
		);
	}

	componentDidMount() {
		this.updatePosition();

		this.closest = null;
	}

	componentDidUpdate() {
		this.updatePosition();
	}

	componentWillUnmount() {
		window.removeEventListener('mouseup', this.onRelease);
		window.removeEventListener('mousemove', this.onDrag);
	}

	updatePosition() {
		const containerBounding = this.containerRef.current?.getBoundingClientRect();

		if (this.props.project instanceof Store.Project) this.props.project.position

		if (containerBounding && this.props.project instanceof Store.Project) {
			this.props.project.position = [containerBounding.left + (containerBounding.width * 0.5), containerBounding.top + (containerBounding.height * 0.5)];
		}
	}

	onGrab = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
		const containerBounding = this.containerRef.current?.getBoundingClientRect();

		if (containerBounding) {
			this.dimensions = {
				width: containerBounding.width,
				height: containerBounding.height
			};

			this.position = {
				grab: [event.pageX, event.pageY],
				container: [containerBounding.left, containerBounding.top]
			};
		}

		window.addEventListener('mouseup', this.onRelease);
		window.addEventListener('mousemove', this.onDrag);

		this.placeholder.height = this.dimensions?.height ?? null;
	}

	onRelease = () => {
		this.dimensions = null;
		this.position = null;

		window.removeEventListener('mouseup', this.onRelease);
		window.removeEventListener('mousemove', this.onDrag);

		this.setState({offset: null});

		if (this.closest && this.props.project instanceof Store.Project) this.props.projectDataStore.moveProject(this.props.project, this.placeholder);
		this.props.projectDataStore.movePlaceholder(this.placeholder, 'remove');
	}

	onDrag = (event: MouseEvent) => {
		this.props.projectDataStore?.projects.forEach(project => {
			if (project instanceof Store.ProjectPlaceholder || project === this.props.project) return;

			if (project.position && this.props.project instanceof Store.Project && this.props.project.position) {
				const x = project.position[0] - this.props.project.position[0];
				const y = project.position[1] - this.props.project.position[1];

				const closestX = this.closest?.position ? this.closest?.position[0] - this.props.project.position[0] : null;
				const closestY = this.closest?.position ? this.closest?.position[1] - this.props.project.position[1] : null;

				const difference = Math.abs(x) + Math.abs(y);
				const closestDifference = (closestX !== null && closestY !== null) && Math.abs(closestX) + Math.abs(closestY);

				if (this.closest === null || (closestDifference !== false && (difference < closestDifference))) {
					this.closest = project;

					let below = this.props.project.position[1] < (this.closest?.position ? this.closest?.position[1] : 0);

					this.props.projectDataStore.movePlaceholder(this.placeholder, this.closest, below);
				}
			}
		});

		const offset = {
			x: event.pageX - ((this.position?.grab && this.position.grab[0]) ?? 0),
			y: event.pageY - ((this.position?.grab && this.position.grab[1]) ?? 0)
		};

		this.setState({
			offset: [
				offset.x,
				offset.y
			]
		});
	}
}

// #endregion Task Components

// #region [Group] Control Components

interface CheckboxControlProps {
	checked?: boolean;
	right?: boolean;
}

interface CheckboxControlState {
	checked: boolean;
}

export class CheckboxControl extends React.Component<CheckboxControlProps, CheckboxControlState> {
	state: CheckboxControlState = {checked: this.props.checked !== undefined ? this.props.checked : false};
	prevProps: CheckboxControlProps = {};

	style = {
		container: css`
			float: ${this.props.right ? 'right' : 'left'};
			height: 16px; width: 16px;
			min-width: 16px;

			border-radius: 2px;
			box-sizing: border-box;
			border: solid 2px;
			border-color: ${AppTheme.softText.get()};
			transition: border-color 0.05s, background-color 0.05s;

			&[state-checked="true"] {
				border-color: ${AppTheme.primary.get()};
				background-color: ${AppTheme.primary.get()};
			}
		`,
		check: css`
			position: relative;

			opacity: 0;
			transition: opacity 0.05s;

			&[state-checked="true"] {
				opacity: 1;
			}
		`,
		svg: css`
			position: absolute;
			top: 0; left: 0; right: 0; bottom: 0;

			transform: scale(1.3);

			&>path {
				stroke-width: 3px;
			}
		`
	};

	evalProps() {
		if (this.prevProps !== this.props) this.state.checked = this.props.checked !== undefined ? this.props.checked : false;
		this.prevProps = this.props;
	}

	render() {
		this.evalProps();

		return (
			<div className={this.style.container} {...{'state-checked': this.state.checked.toString()}}>
				<div className={this.style.check} {...{'state-checked': this.state.checked.toString()}}>
					<svg className={this.style.svg} focusable="false" viewBox="0 0 24 24">
						<path fill="none" stroke="white" d="M4.1,12.7 9,17.6 20.3,6.3" />
					</svg>
				</div>
			</div>
		);
	}
}

interface SelectControlOption {
	group: string;
	options: string[] | SelectControlOption[];
}

interface SelectControlOptionSelected {
	(name: string, index: number, selected: boolean, selection: {[globalIndex: number]: string}, tree: string[]): void;
}

interface SelectControlProps {
	name: string;
	showSelected?: boolean;

	options: SelectControlOption['options'];
	checkable?: boolean;
	default?: number;

	onSelection?: SelectControlOptionSelected;

	style?: {
		filled?: boolean;
	}
}

interface SelectControlState {
	isMenuOpen: boolean;

	selectedOptions: null | {[globalIndex: number]: string};
}

export class SelectControl extends React.Component<SelectControlProps, SelectControlState> {
	state: SelectControlState = {isMenuOpen: false, selectedOptions: null};

	style = {
		container: css`
			padding: 8px;

			cursor: pointer;
			border-radius: 4px;
			color: ${AppTheme.softText.get()};

			&:hover {
				background-color: ${AppTheme.primary.get({opacity: 0.1})};
			}

			&[state-filled="true"] {
				background-color: ${AppTheme.material.get()};

				&:hover {
					color: white;
					background-color: ${AppTheme.primary.get({opacity: 0.75})};
				}
			}
		`,
		menu: {
			container: css`
				z-index: 32;
				position: absolute;
				min-width: 200px;
				max-width: 600px;

				opacity: 0;
				overflow: hidden;
				user-select: none;
				border-radius: 4px;
				pointer-events: none;
				color: ${AppTheme.softText.get()};
				background-color: ${AppTheme.material.get()};
				box-shadow: 0px 2px 2px 0 ${AppTheme.shadowColor.get({opacity: 0.1})};

				transform: translateY(5px);
				transition: opacity 0.1s, transform 0.1s;

				&[state-open="true"] {
					opacity: 1;
					pointer-events: all;
					transform: unset;
				}
			`,
			blocker: css`
				z-index: 32;
				position: absolute;
				display: none;
				top: 0; left: 0; right: 0; bottom: 0;

				&[state-open="true"] {
					display: block;
				}
			`,
			group: {
				name: css`
					padding: 8px;

					font-size: 14px;
					text-transform: uppercase;
				`,
			},
			option: {
				container: css`
					display: flex;
					padding: 12px 12px;

					cursor: pointer;
					font-size: 15px;
					transition: color 0.05s;

					&:hover {
						background-color: ${AppTheme.material.get({lightness: -10, opacity: 0.65})};
					}

					&[state-selected="true"] {
						color: ${AppTheme.primary.get()};
					}
				`,
				text: css`
					margin-right: 16px;
					flex-grow: 1;
				`
			}
		}
	};

	containerRef = React.createRef<HTMLDivElement>();
	menuRef = React.createRef<HTMLDivElement>();

	toggle(open?: boolean) {
		if (open !== undefined) this.setState({isMenuOpen: open});
		else this.setState({isMenuOpen: !this.state.isMenuOpen});
	}

	setSelectedOption(name: string, globalIndex: number, trace: string[]) {
		let options = this.props.checkable ? (this.state.selectedOptions ?? {}) : {};

		if (this.props.checkable && options[globalIndex] !== undefined) delete options[globalIndex];
		else options[globalIndex] = name;

		this.setState({selectedOptions: options});
		if (this.props.onSelection) this.props.onSelection(name, globalIndex, options[globalIndex] !== undefined, options, trace);
	}

	private getOptionNode(name: string, globalIndex: number, trace: string[]) {
		// This is the unique index of the option excluding groups
		const correctedIndex = globalIndex - trace.length;
		const selected = this.state.selectedOptions !== null && this.state.selectedOptions[globalIndex] !== undefined;

		if (correctedIndex === this.props.default && this.state.selectedOptions === null) {
			this.state.selectedOptions = {};
			this.state.selectedOptions[globalIndex] = name;
		}

		return (
			<div
				key={globalIndex}
				className={this.style.menu.option.container}
				style={{paddingLeft: 12 + (8 * trace.length)}}
				onClick={event => {
					this.setSelectedOption(name, globalIndex, trace)

					if (this.props.checkable) event.stopPropagation();
				}}
				{...{'state-selected': selected.toString()}}
			>
				<div className={this.style.menu.option.text}>{name}</div>

				{
					this.props.checkable &&
					<CheckboxControl right checked={selected} />
				}
			</div>
		);
	}

	private getOptions(options: SelectControlOption['options']) {
		return this.map(options).node;
	}

	private map(options: SelectControlOption['options'], parentGlobalIndex?: number, parentTrace?: string[]) {
		const node: JSX.Element[] = [];
		let globalIndex: number = parentGlobalIndex ?? -1;
		let trace: string[] = parentTrace ?? [];
		let depth: number = trace.length;

		options.forEach((option: string | SelectControlOption, index: number) => {
			globalIndex++;

			if (typeof option === 'string') {
				node.push(this.getOptionNode(option, globalIndex, trace));
			} else {
				const sub_map = this.map(option.options, globalIndex, [...trace, option.group]);
				globalIndex = sub_map.globalIndex;

				node.push(
					<div key={index}>
						<div className={this.style.menu.group.name} style={{paddingLeft: 12 + (8 * depth)}}>{option.group}</div>
						{sub_map.node}
					</div>
				);
			}
		});

		return {node, globalIndex: globalIndex};
	}

	render() {
		const states = {
			'state-open': this.state.isMenuOpen.toString()
		};

		const containerBoundingClient = getBoundingClient(this.containerRef);
		const menuBoundingClient = getBoundingClient(this.menuRef);
		const menuPosition = {
			top: containerBoundingClient.top + menuBoundingClient.height > window.innerHeight ? containerBoundingClient.bottom - menuBoundingClient.height : containerBoundingClient.top,
			left: containerBoundingClient.left + menuBoundingClient.width > window.innerWidth ? containerBoundingClient.right - menuBoundingClient.width : containerBoundingClient.left
		};

		return (
			<div className={this.style.container} onClick={() => this.toggle()} ref={this.containerRef} {...{'state-filled': (this.props.style?.filled ?? false).toString()}}>
				{this.props.name}
				<Icon name="expand_more" thick right />

				{
					ReactDOM.createPortal(
						<div>
							<div className={this.style.menu.blocker} {...states} />
							<div
								ref={this.menuRef}
								className={this.style.menu.container}
								style={{top: menuPosition.top, left: menuPosition.left}}
								{...states}
							>
								{
									this.getOptions(this.props.options)
								}
							</div>
						</div>,
						document.body
					)
				}
			</div>
		);
	}
}

// #endregion
