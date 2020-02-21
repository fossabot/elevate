import { TestBed } from "@angular/core/testing";

import { BulkRefreshStatsNotification, DesktopActivityService } from "./desktop-activity.service";
import { CoreModule } from "../../../../core/core.module";
import { SharedModule } from "../../../shared.module";
import { DesktopModule } from "../../../modules/desktop/desktop.module";
import { ActivityStreamsModel, AthleteSettingsModel, AthleteSnapshotModel, Gender, SyncedActivityModel, UserSettings } from "@elevate/shared/models";
import { FlaggedIpcMessage, MessageFlag } from "@elevate/shared/electron";
import { PROMISE_TRON } from "../../../../desktop/ipc-messages/promise-tron.interface";
import { PromiseTronServiceMock } from "../../../../desktop/ipc-messages/promise-tron.service.mock";
import { CompressedStreamModel } from "@elevate/shared/models/sync";
import * as _ from "lodash";
import { AnalysisDataModel } from "../../../../../../modules/shared/models/activity-data";
import DesktopUserSettingsModel = UserSettings.DesktopUserSettingsModel;

describe("DesktopActivityService", () => {
	let desktopActivityService: DesktopActivityService;

	beforeEach(() => {

		TestBed.configureTestingModule({
			imports: [
				CoreModule,
				SharedModule,
				DesktopModule
			],
			providers: [
				DesktopActivityService,
				{provide: PROMISE_TRON, useClass: PromiseTronServiceMock}
			]
		});

		desktopActivityService = TestBed.inject(DesktopActivityService);
	});

	describe("Compute", () => {

		it("should compute a synced activity along user settings, athlete snapshot and streams", (done: Function) => {

			// Given
			const syncedActivityModel: SyncedActivityModel = new SyncedActivityModel();
			const userSettingsModel: DesktopUserSettingsModel = DesktopUserSettingsModel.DEFAULT_MODEL;
			const athleteSnapshotModel: AthleteSnapshotModel = new AthleteSnapshotModel(Gender.MEN, AthleteSettingsModel.DEFAULT_MODEL);
			const streams: ActivityStreamsModel = new ActivityStreamsModel([0, 1], [0, 1], [0, 1]);
			const expectedFlaggedIpcMessage: FlaggedIpcMessage = new FlaggedIpcMessage(MessageFlag.COMPUTE_ACTIVITY, syncedActivityModel, athleteSnapshotModel, userSettingsModel, streams);
			const sendMessageSpy = spyOn(desktopActivityService.ipcMessagesSender, "send").and.returnValue(Promise.resolve(syncedActivityModel));

			// When
			const promise: Promise<SyncedActivityModel> = desktopActivityService.compute(syncedActivityModel, userSettingsModel, athleteSnapshotModel, streams);

			// Then
			promise.then(() => {
				expect(sendMessageSpy).toHaveBeenCalledTimes(1);
				expect(sendMessageSpy).toHaveBeenCalledWith(expectedFlaggedIpcMessage);
				done();
			}, err => {
				throw new Error(err);
			});
		});

		it("should reject compute of a synced activity along user settings, athlete snapshot and streams", (done: Function) => {

			// Given
			const syncedActivityModel: SyncedActivityModel = new SyncedActivityModel();
			const userSettingsModel: DesktopUserSettingsModel = DesktopUserSettingsModel.DEFAULT_MODEL;
			const athleteSnapshotModel: AthleteSnapshotModel = new AthleteSnapshotModel(Gender.MEN, AthleteSettingsModel.DEFAULT_MODEL);
			const streams: ActivityStreamsModel = new ActivityStreamsModel([0, 1], [0, 1], [0, 1]);
			const expectedFlaggedIpcMessage: FlaggedIpcMessage = new FlaggedIpcMessage(MessageFlag.COMPUTE_ACTIVITY, syncedActivityModel, athleteSnapshotModel, userSettingsModel, streams);
			const expectedErrorMessage = "Computation error";
			const sendMessageSpy = spyOn(desktopActivityService.ipcMessagesSender, "send").and.returnValue(Promise.reject(expectedErrorMessage));

			// When
			const promise: Promise<SyncedActivityModel> = desktopActivityService.compute(syncedActivityModel, userSettingsModel, athleteSnapshotModel, streams);

			// Then
			promise.then(() => {
				throw new Error("Should not be here");
			}, err => {
				expect(err).toEqual(expectedErrorMessage);
				expect(sendMessageSpy).toHaveBeenCalledTimes(1);
				expect(sendMessageSpy).toHaveBeenCalledWith(expectedFlaggedIpcMessage);
				done();
			});
		});
	});

	describe("Refresh stats", () => {

		it("should refresh stats of a synced activity along user settings given", (done: Function) => {

			// Given
			const activityId = "1111";
			const syncedActivityModel: SyncedActivityModel = new SyncedActivityModel();
			syncedActivityModel.id = activityId;
			syncedActivityModel.start_time = new Date().toISOString();

			const expectedSyncedActivityModel = _.cloneDeep(syncedActivityModel);
			expectedSyncedActivityModel.extendedStats = new AnalysisDataModel();

			const userSettingsModel: DesktopUserSettingsModel = DesktopUserSettingsModel.DEFAULT_MODEL;
			const athleteSnapshotModel: AthleteSnapshotModel = new AthleteSnapshotModel(Gender.MEN, AthleteSettingsModel.DEFAULT_MODEL);
			const streams: ActivityStreamsModel = new ActivityStreamsModel([0, 1], [0, 1], [0, 1]);
			const expectedFlaggedIpcMessage: FlaggedIpcMessage = new FlaggedIpcMessage(MessageFlag.COMPUTE_ACTIVITY, syncedActivityModel, athleteSnapshotModel, userSettingsModel, streams);
			const compressedStreamModel = new CompressedStreamModel(activityId, "streamData");

			const athleteSnapshotUpdateSpy = spyOn(desktopActivityService.athleteSnapshotResolverService, "update").and.returnValue(Promise.resolve());
			const athleteSnapshotResolveSpy = spyOn(desktopActivityService.athleteSnapshotResolverService, "resolve").and.returnValue(athleteSnapshotModel);
			const streamGetByIdSpy = spyOn(desktopActivityService.streamsService, "getById").and.returnValue(compressedStreamModel);
			const deflateCompressedStreamSpy = spyOn(ActivityStreamsModel, "deflate").and.returnValue(streams);
			const selfComputeSpy = spyOn(desktopActivityService, "compute").and.callThrough();
			const sendMessageSpy = spyOn(desktopActivityService.ipcMessagesSender, "send").and.returnValue(Promise.resolve(expectedSyncedActivityModel));
			const updateDbSpy = spyOn(desktopActivityService.activityDao, "put").and.returnValue(Promise.resolve(expectedSyncedActivityModel));

			// When
			const promise: Promise<SyncedActivityModel> = desktopActivityService.refreshStats(syncedActivityModel, userSettingsModel);

			// Then
			promise.then(result => {

				expect(athleteSnapshotUpdateSpy).toHaveBeenCalledTimes(1);
				expect(athleteSnapshotResolveSpy).toHaveBeenCalledTimes(1);
				expect(athleteSnapshotResolveSpy).toHaveBeenCalledWith(new Date(expectedSyncedActivityModel.start_time));
				expect(streamGetByIdSpy).toHaveBeenCalledTimes(1);
				expect(streamGetByIdSpy).toHaveBeenCalledWith(expectedSyncedActivityModel.id);
				expect(deflateCompressedStreamSpy).toHaveBeenCalledTimes(1);
				expect(deflateCompressedStreamSpy).toHaveBeenCalledWith(compressedStreamModel.data);
				expect(selfComputeSpy).toHaveBeenCalledTimes(1);
				expect(sendMessageSpy).toHaveBeenCalledTimes(1);
				expect(sendMessageSpy).toHaveBeenCalledWith(expectedFlaggedIpcMessage);
				expect(updateDbSpy).toHaveBeenCalledTimes(1);
				expect(result).toEqual(expectedSyncedActivityModel);

				done();
			}, err => {
				throw new Error(err);
			});
		});

		it("should not refresh stats of a synced activity if NO stream given", (done: Function) => {

			// Given
			const activityId = "1111";
			const syncedActivityModel: SyncedActivityModel = new SyncedActivityModel();
			syncedActivityModel.id = activityId;
			syncedActivityModel.start_time = new Date().toISOString();
			const userSettingsModel: DesktopUserSettingsModel = DesktopUserSettingsModel.DEFAULT_MODEL;
			const athleteSnapshotModel: AthleteSnapshotModel = new AthleteSnapshotModel(Gender.MEN, AthleteSettingsModel.DEFAULT_MODEL);

			const athleteSnapshotUpdateSpy = spyOn(desktopActivityService.athleteSnapshotResolverService, "update").and.returnValue(Promise.resolve());
			const athleteSnapshotResolveSpy = spyOn(desktopActivityService.athleteSnapshotResolverService, "resolve").and.returnValue(athleteSnapshotModel);
			const streamGetByIdSpy = spyOn(desktopActivityService.streamsService, "getById").and.returnValue(Promise.resolve(null));
			const deflateCompressedStreamSpy = spyOn(ActivityStreamsModel, "deflate").and.stub();
			const selfComputeSpy = spyOn(desktopActivityService, "compute").and.callThrough();
			const sendMessageSpy = spyOn(desktopActivityService.ipcMessagesSender, "send").and.stub();
			const updateDbSpy = spyOn(desktopActivityService.activityDao, "put").and.stub();

			// When
			const promise: Promise<SyncedActivityModel> = desktopActivityService.refreshStats(syncedActivityModel, userSettingsModel);

			// Then
			promise.then(result => {
				expect(athleteSnapshotUpdateSpy).toHaveBeenCalledTimes(1);
				expect(athleteSnapshotResolveSpy).toHaveBeenCalledTimes(1);
				expect(athleteSnapshotResolveSpy).toHaveBeenCalledWith(new Date(syncedActivityModel.start_time));
				expect(streamGetByIdSpy).toHaveBeenCalledTimes(1);
				expect(streamGetByIdSpy).toHaveBeenCalledWith(syncedActivityModel.id);
				expect(deflateCompressedStreamSpy).not.toHaveBeenCalled();
				expect(sendMessageSpy).not.toHaveBeenCalled();
				expect(selfComputeSpy).not.toHaveBeenCalled();
				expect(sendMessageSpy).not.toHaveBeenCalled();
				expect(updateDbSpy).not.toHaveBeenCalled();
				expect(result).toEqual(syncedActivityModel);
				done();
			}, err => {
				throw new Error(err);
			});
		});
	});

	describe("Bulk refresh stats", () => {

		it("should bulk compute a set of synced activities", (done: Function) => {

			const userSettingsModel: DesktopUserSettingsModel = DesktopUserSettingsModel.DEFAULT_MODEL;

			const syncedActivityModel_1 = new SyncedActivityModel();
			syncedActivityModel_1.id = "1111";

			const syncedActivityModel_2 = new SyncedActivityModel();
			syncedActivityModel_2.id = "2222";

			const syncedActivityModel_3 = new SyncedActivityModel();
			syncedActivityModel_3.id = "3333";

			const syncedActivityModels = [
				syncedActivityModel_1,
				syncedActivityModel_2,
				syncedActivityModel_3,
			];

			const refreshStatsSpy = spyOn(desktopActivityService, "refreshStats").and.callFake((syncedActivityModel: SyncedActivityModel) => {
				return Promise.resolve(syncedActivityModel); // Bypass refresh stats of an activity. Already tested.
			});

			// When
			desktopActivityService.bulkRefreshStats(syncedActivityModels, userSettingsModel);

			// Then
			desktopActivityService.refreshStats$.subscribe((notification: BulkRefreshStatsNotification) => {
				expect(desktopActivityService.isProcessing).toBeTruthy();
				expect(notification).toBeDefined();
				expect(notification.toProcessCount).toEqual(syncedActivityModels.length);
				if (notification.isLast) {
					expect(refreshStatsSpy).toHaveBeenCalledTimes(3);
					setTimeout(() => {
						expect(desktopActivityService.isProcessing).toBeFalsy();
						done();
					});
				}
			}, error => {
				throw error;
			}, () => {
				throw new Error("Should not complete");
			});

		});

		it("should bulk compute a set of synced activities ids", (done: Function) => {

			const userSettingsModel: DesktopUserSettingsModel = DesktopUserSettingsModel.DEFAULT_MODEL;

			const activityIds = ["1111", "2222", "3333"];

			const getByIdSpy = spyOn(desktopActivityService, "getById").and.callFake(id => {
				const syncedActivityModel = new SyncedActivityModel();
				syncedActivityModel.id = id;
				return Promise.resolve(syncedActivityModel);
			});

			const refreshStatsSpy = spyOn(desktopActivityService, "refreshStats").and.callFake((syncedActivityModel: SyncedActivityModel) => {
				return Promise.resolve(syncedActivityModel); // Bypass refresh stats of an activity. Already tested.
			});

			// When
			desktopActivityService.bulkRefreshStatsFromIds(activityIds, userSettingsModel);

			// Then
			desktopActivityService.refreshStats$.subscribe((notification: BulkRefreshStatsNotification) => {
				expect(desktopActivityService.isProcessing).toBeTruthy();
				expect(notification).toBeDefined();
				expect(notification.toProcessCount).toEqual(activityIds.length);
				if (notification.isLast) {
					expect(getByIdSpy).toHaveBeenCalledTimes(3);
					expect(refreshStatsSpy).toHaveBeenCalledTimes(3);
					setTimeout(() => {
						expect(desktopActivityService.isProcessing).toBeFalsy();
						done();
					});
				}
			}, error => {
				throw error;
			}, () => {
				throw new Error("Should not complete");
			});

		});

		it("should refresh all activities", (done: Function) => {

			// Given
			const userSettingsModel: DesktopUserSettingsModel = DesktopUserSettingsModel.DEFAULT_MODEL;

			const syncedActivityModel_1 = new SyncedActivityModel();
			syncedActivityModel_1.id = "1111";

			const syncedActivityModel_2 = new SyncedActivityModel();
			syncedActivityModel_2.id = "2222";

			const syncedActivityModel_3 = new SyncedActivityModel();
			syncedActivityModel_3.id = "3333";

			const syncedActivityModels = [
				syncedActivityModel_1,
				syncedActivityModel_2,
				syncedActivityModel_3,
			];

			const refreshStatsSpy = spyOn(desktopActivityService, "refreshStats").and.callFake((syncedActivityModel: SyncedActivityModel) => {
				return Promise.resolve(syncedActivityModel); // Bypass refresh stats of an activity. Already tested.
			});

			const fetchSpy = spyOn(desktopActivityService, "fetch").and.returnValue(Promise.resolve(syncedActivityModels));

			// When
			desktopActivityService.bulkRefreshStatsAll(userSettingsModel);

			// Then
			desktopActivityService.refreshStats$.subscribe((notification: BulkRefreshStatsNotification) => {
				expect(desktopActivityService.isProcessing).toBeTruthy();
				expect(notification).toBeDefined();
				expect(notification.toProcessCount).toEqual(syncedActivityModels.length);
				if (notification.isLast) {
					expect(fetchSpy).toHaveBeenCalledTimes(1);
					expect(refreshStatsSpy).toHaveBeenCalledTimes(3);
					setTimeout(() => {
						expect(desktopActivityService.isProcessing).toBeFalsy();
						done();
					});
				}
			}, error => {
				throw error;
			}, () => {
				throw new Error("Should not complete");
			});
		});
	});
});
