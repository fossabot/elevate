import { AppUsage } from "./app-usage.model";

export class AppUsageDetails extends AppUsage {

    public megaBytesInUse: number;
    public percentUsage: number;

    constructor(appUsage: AppUsage, megaBytesInUse: number, percentUsage: number) {
        super(appUsage.bytesInUse, appUsage.quotaBytes);
        this.megaBytesInUse = megaBytesInUse;
        this.percentUsage = percentUsage;
    }
}
