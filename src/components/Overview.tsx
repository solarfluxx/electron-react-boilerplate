/* eslint-disable */

import { css } from '@emotion/css';
import { observer } from 'mobx-react';
import React from 'react';
import AppTheme from '../common/AppTheme';
import { ProjectDataStore } from '../common/store';
import { Search, SelectControl, ProjectContainer } from './Components';

interface PageProps {
	text: string;

	projectDataStore: ProjectDataStore;
}

@observer
export default class Page extends React.Component<PageProps> {
	style = {
		container: css`
			padding: 16px 24px;
		`,
		titleBar: {
			container: css`
				display: flex;
				margin-bottom: 24px;

				align-items: center;

				&>* {
					margin-right: 16px;
				}
			`,
			title: css`
				flex-grow: 1;
				font-size: 26px;
				font-weight: 500;
				color: ${AppTheme.titleText.get()};
			`
		},
		taskControlBar: css`
			display: flex;
			margin-bottom: 24px;

			align-items: center;

			&>* {
				margin-right: 16px;
			}
		`
	};

	render() {
		const projectData = this.props.projectDataStore;

		return (
			<div className={this.style.container}>
				<div className={this.style.titleBar.container}>
					<div className={this.style.titleBar.title}>{this.props.text}</div>
					<SelectControl
						name={projectData.selectedView?.name ?? 'View'}
						default={1}
						style={{filled: true}}
						options={projectData.views.map(view => view.name)}
						onSelection={(name) => projectData.views.forEach(view => {if (view.name === name) projectData.setProjectView(view)})}
					/>
				</div>

				<div className={this.style.taskControlBar}>
					<Search />
					<SelectControl
						name="Filters"
						checkable
						options={[
							{
								group: 'By Group',
								options: projectData?.groups.map(group => group.name) ?? []
							},
							{
								group: 'By Column',
								options: projectData?.columns.map(column => column.name) ?? []
							}
						]}
						onSelection={
							(name, _index, selected, _selection, trace) => {
								switch(trace[0]) {
									case 'By Group':
										const groups = projectData.getContainerByName('group', name);
										groups.forEach(
											group => selected ?
											projectData.addFilter({group: group}) :
											projectData.removeFilter({group})
										);

										break;
									case 'By Column':
										const columns = projectData.getContainerByName('column', name);
										columns.forEach(
											column => selected ?
											projectData.addFilter({column}) :
											projectData.removeFilter({column})
										);

										break;
								}
							}
						}
					/>
					<SelectControl
						name="Assignee"
						checkable
						options={projectData.assignees}
						onSelection={
							(assignee, _index, selected) => {
								selected ?
								projectData.addFilter({assignee}) :
								projectData.removeFilter({assignee})
							}
						}
					/>
				</div>

				<ProjectContainer projectDataStore={projectData} />
			</div>
		);
	}
}
