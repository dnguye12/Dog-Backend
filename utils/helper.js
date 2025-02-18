const featureNames = [
    "popularity_ranking",
    "size",
    "lifetime_cost",
    "intelligence",
    "grooming_frequency",
    "suitability_for_children"
];

const convertGrooming = (grooming_frequency) => {
    if (grooming_frequency === "Daily") {
        return 0
    }
    else if (grooming_frequency === "Once a week") {
        return 1
    } else if (grooming_frequency === "Once in a few weeks") {
        return 2
    }
    else {
        return 1
    }
}

const scoreBreed = (breed, preferences, stats) => {
    let score = 0
    let contributions = {}

    for (let feature of featureNames) {
        let contribution = 0
        const userVal = preferences[feature]
        if (userVal !== -1) {
            if (feature === "size") {
                if (breed[feature] !== userVal) {
                    return -Infinity
                } else {
                    contribution = 1;
                }
            } else if (feature === "grooming_frequency") {
                const helper = convertGrooming(breed[feature])
                if (helper === userVal) {
                    contribution = 1;
                }
            } else if (feature === "suitability_for_children") {
                if (breed[feature] === userVal) {
                    contribution = 1;
                } else {
                    return -Infinity
                }
            }
            else {
                let statLow, statHigh;
                if (feature === "popularity_ranking") {
                    statLow = stats.lowest_popularity;
                    statHigh = stats.highest_popularity;
                } else if (feature === "lifetime_cost") {
                    statLow = stats.lowest_lifetime_cost;
                    statHigh = stats.highest_lifetime_cost;
                } else if (feature === "intelligence") {
                    statLow = stats.lowest_intelligence;
                    statHigh = stats.highest_intelligence;
                }
                const range = statHigh - statLow;
                const diff = Math.abs(breed[feature] - userVal);
                contribution = range ? Math.max(0, 1 - diff / range) : (breed[feature] === userVal ? 1 : 0);
            }
        } else {
            if (feature === "popularity_ranking") {
                contribution = 0.5 * (1 - (breed[feature] - stats.lowest_popularity) / (stats.highest_popularity - stats.lowest_popularity))
            } else if (feature === "lifetime_cost") {
                contribution = 0.5 * (1 - (breed[feature] - stats.lowest_lifetime_cost) / (stats.highest_lifetime_cost - stats.lowest_lifetime_cost))
            } else if (feature === "intelligence") {
                contribution = 0.5 * ((breed[feature] - stats.lowest_intelligence) / (stats.highest_intelligence - stats.lowest_intelligence))
            }
        }

        contributions[feature] = contribution
        score += contribution
    }
    return { score, contributions }
}

module.exports = scoreBreed