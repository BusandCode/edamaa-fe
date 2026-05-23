/** Method to return media health based on the media & network stats */
function getNetworkBasedMediaHealth({ stats, }) {
    if (!stats || !stats.length) {
        return null;
    }
    let networkHealth = 'Good';
    const allStatsHealths = stats.map((statsObj) => statsObj.verdict);
    if (allStatsHealths.includes('Poor')) {
        networkHealth = 'Poor';
    }
    else if (allStatsHealths.includes('Average')) {
        networkHealth = 'Average';
    }
    return networkHealth;
}
/** Gives verdict based on the packet loss */
function getPacketLossVerdict({ packetLossPercentage, }) {
    let verdict = 'Good';
    if (packetLossPercentage > 4) {
        verdict = 'Poor';
    }
    else if (packetLossPercentage >= 1 && packetLossPercentage <= 4) {
        verdict = 'Average';
    }
    return verdict;
}
/** Gives verdict based on the jitter */
function getJitterVerdict({ jitterInMS }) {
    let verdict = 'Good';
    if (jitterInMS > 100) {
        verdict = 'Poor';
    }
    else if (jitterInMS >= 50 && jitterInMS <= 100) {
        verdict = 'Average';
    }
    return verdict;
}
/** Gives verdict based on the jitter */
function getBitrateVerdict({ bitrate, }) {
    let verdict = 'Good';
    const bitrateInKbps = Math.round(bitrate / 1024); // it is Kilo bits
    if (bitrateInKbps === 0) {
        verdict = 'Poor';
    }
    return verdict;
}
function getOverallBatteryVerdict({ stats }) {
    if (!stats || !stats.length) {
        return null;
    }
    let networkHealth = 'Good';
    const allStatsHealths = stats.map((statsObj) => statsObj.verdict);
    if (allStatsHealths.includes('Poor')) {
        networkHealth = 'Poor';
    }
    else if (allStatsHealths.includes('Average')) {
        networkHealth = 'Average';
    }
    return networkHealth;
}
function getBatteryLevelVerdict({ batteryLevelPercentage, }) {
    let batteryLevelVerdict = 'Good';
    if (batteryLevelPercentage < 20) {
        batteryLevelVerdict = 'Poor';
    }
    else if (batteryLevelPercentage < 50) {
        batteryLevelVerdict = 'Average';
    }
    return batteryLevelVerdict;
}
function getBatteryChargingVerdict({ charging, dischargingTimeInSeconds, batteryLevelPercentage, }) {
    const MINS_30 = 30 * 60;
    if (batteryLevelPercentage < 20) {
        return 'Poor';
    }
    if (charging) {
        return 'Good';
    }
    if (dischargingTimeInSeconds < MINS_30) {
        return 'Poor';
    }
    return 'Average';
}

export { getPacketLossVerdict as a, getJitterVerdict as b, getNetworkBasedMediaHealth as c, getBatteryLevelVerdict as d, getBatteryChargingVerdict as e, getOverallBatteryVerdict as f, getBitrateVerdict as g };
