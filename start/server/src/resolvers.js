const { paginateResults } = require("./utils");

module.exports = {
  Query: {
    launches: async (_, { pageSize = 20, after }, { dataSources }) => {
      const allLaunches = await dataSources.launchAPI.getAllLaunches();
      allLaunches.reverse();
      const launches = paginateResults({
        after,
        pageSize,
        results: allLaunches
      });
      return {
        cursor: launches.length ? launches[launches.length - 1].cursor : null,
        hasMore: launches.length
          ? launches[launches.length - 1].cursor !==
            allLaunches[allLaunches.length - 1].cursor
          : false,
        launches
      };
    },
    launch: (_, { id }, { dataSources }) =>
      dataSources.launchAPI.getLaunchById({ launchId: id }),
    me: (_, __, { dataSources }) => dataSources.useAPI.findOrCreateUser()
  },
  Mutation: {
    login: async (_, { email }, { dataSources }) => {
      const user = await dataSources.userAPI.findOrCreateUser({ email });
      if (user) return Buffer.from(email).toString("base64");
    },
    bookTrips: async (_, { launchIds }, { dataSources }) => {
      console.log("りぞ", launchIds);
      const results = await dataSources.userAPI.bookTrips({ launchIds });
      const launches = await dataSources.launchAPI.getLaunchesByIds({
        launchIds
      });

      return {
        success: results && results.length === launchIds.length,
        message:
          results && results.length
            ? "trip booked successfully"
            : `the following launches couldn't booked: ${launchIds.filter(
                id => !results.includes(id)
              )}`,
        launches
      };
    },
    cancelTrip: async (_, { launchId }, { dataSources }) => {
      const result = await dataSources.userAPI.cancelTrip({ launchId });

      if (!result) {
        return {
          success: false,
          message: `fail to cancel trip: ${launchId}`
        };
      }

      const launch = await dataSources.launchAPI.getLaunchById({ launchId });

      return {
        success: true,
        message: "trip canceled successfully",
        launches: [launch]
      };
    }
  },
  Mission: {
    missionPatch: (mission, { size } = { size: "LARGE" }) => {
      switch (size) {
        case "SMALL":
          return mission.missionPatchSmall;
        case "LARGE":
        default:
          return mission.missionPatchLarge;
      }
    }
  },
  Launch: {
    isBooked: async (launch, _, { dataSources }) =>
      dataSources.userAPI.isBookedOnLaunch({ id: launch.id })
  },
  User: {
    trips: async (_, __, { dataSources }) => {
      const launchIds = await dataSources.launchAPI.getLaunchIdsByUser();
      if (!launchIds.length) return [];
      return (
        (await dataSources.launchAPI.getLaunchesByIds({ launchIds })) || []
      );
    }
  }
};
