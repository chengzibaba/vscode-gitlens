import { ContextProvider } from '@lit/context';
import type { State } from '../../../plus/composer/protocol';
import type { ReactiveElementHost, StateProvider } from '../../shared/appHost';
import type { Disposable } from '../../shared/events';
import type { HostIpc } from '../../shared/ipc';
import { stateContext } from './context';

export class ComposerStateProvider implements StateProvider<State> {
	private readonly disposable: Disposable;
	private readonly provider: ContextProvider<{ __context__: State }, ReactiveElementHost>;

	private readonly _state: State;
	get state(): State {
		return this._state;
	}

	constructor(
		host: ReactiveElementHost,
		state: State,
		private readonly _ipc: HostIpc,
	) {
		this._state = state;
		this.provider = new ContextProvider(host, { context: stateContext, initialValue: state });

		// For now, we don't have any IPC messages to handle
		// In the future, this would handle messages like DidChangeComposerData
		this.disposable = this._ipc.onReceiveMessage(_msg => {
			// Handle incoming messages here
			// switch (true) {
			//   case DidChangeComposerData.is(msg):
			//     this._state.hunks = msg.params.hunks;
			//     this._state.commits = msg.params.commits;
			//     this._state.baseCommit = msg.params.baseCommit;
			//     this._state.timestamp = Date.now();
			//     this.provider.setValue(this._state, true);
			//     break;
			// }
		});
	}

	// Methods to update state
	updateSelectedCommit(commitId: string | null, multiSelect: boolean = false) {
		if (multiSelect && commitId) {
			const newSelection = new Set(this._state.selectedCommitIds);
			if (newSelection.has(commitId)) {
				newSelection.delete(commitId);
			} else {
				newSelection.add(commitId);
			}
			this._state.selectedCommitIds = newSelection;

			if (newSelection.size > 1) {
				this._state.selectedCommitId = null;
			} else if (newSelection.size === 1) {
				this._state.selectedCommitId = Array.from(newSelection)[0];
				this._state.selectedCommitIds = new Set();
			} else {
				this._state.selectedCommitId = null;
			}
		} else {
			this._state.selectedCommitIds = new Set();
			this._state.selectedCommitId = commitId;
		}

		// Clear unassigned changes selection
		this._state.selectedUnassignedSection = null;
		this._state.timestamp = Date.now();
		this.provider.setValue(this._state, true);
	}

	updateSelectedUnassignedSection(section: string | null) {
		this._state.selectedUnassignedSection = section;
		this._state.selectedCommitId = null;
		this._state.selectedCommitIds = new Set();
		this._state.timestamp = Date.now();
		this.provider.setValue(this._state, true);
	}

	updateSelectedHunks(hunkId: string, multiSelect: boolean = false) {
		if (multiSelect) {
			const newSelection = new Set(this._state.selectedHunkIds);
			if (newSelection.has(hunkId)) {
				newSelection.delete(hunkId);
			} else {
				newSelection.add(hunkId);
			}
			this._state.selectedHunkIds = newSelection;
		} else {
			this._state.selectedHunkIds = new Set([hunkId]);
		}

		this._state.timestamp = Date.now();
		this.provider.setValue(this._state, true);
	}

	updateSectionExpansion(section: 'commitMessage' | 'aiExplanation' | 'filesChanged', expanded: boolean) {
		switch (section) {
			case 'commitMessage':
				this._state.commitMessageExpanded = expanded;
				break;
			case 'aiExplanation':
				this._state.aiExplanationExpanded = expanded;
				break;
			case 'filesChanged':
				this._state.filesChangedExpanded = expanded;
				break;
		}

		this._state.timestamp = Date.now();
		this.provider.setValue(this._state, true);
	}

	dispose(): void {
		this.disposable.dispose();
	}
}
