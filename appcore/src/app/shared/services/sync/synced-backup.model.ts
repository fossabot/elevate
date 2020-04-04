import { AthleteModel, SyncedActivityModel } from "@elevate/shared/models";

export class SyncedBackupModel {
    public syncDateTime: number;
    public syncedActivities: SyncedActivityModel[];
    public pluginVersion: string;
    public athleteModel: AthleteModel;
}
