/* eslint-disable */

import { css } from '@emotion/css';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import React from 'react';
import OverviewPage from './components/Overview';
import AppTheme from './common/AppTheme';
import { RootStore } from './common/store';
import { observer } from 'mobx-react';

interface AppProps {
	rootStore: RootStore;
}

interface AppStyles {
	appRoot: string;
}

@observer
export default class App extends React.Component<AppProps> {
	style: AppStyles = {
		appRoot: css`
			position: fixed;
			top: 0; left: 0; right: 0; bottom: 0;

			overflow: auto;
			user-select: none;
			background-color: ${AppTheme.background.get({theme: 0})};
		`,
	};

	render() {
		console.log('App render');
		console.log(this.props.rootStore);

		return (
			<div className={this.style.appRoot}>
				<Router>
					<Switch>
						<Route path="/">
							<OverviewPage projectDataStore={this.props.rootStore.projectDataStore} text="Planner" />
						</Route>
					</Switch>
				</Router>
			</div>
		);
	}
}
