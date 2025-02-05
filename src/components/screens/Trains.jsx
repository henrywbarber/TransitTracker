import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  SectionList,
  SafeAreaView,
  StatusBar,
  FlatList,
  Switch,
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";

function Trains() {
  const [search, setSearch] = useState("");
  const [filteredStations, setFilteredStations] = useState({});
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lines, setLines] = useState([
    {
      label: "Red",
      codes: ["red"],
      color: "#c60c30",
      stations: [],
      dropdownOn: false,
      isFiltered: false,
      directions: {
        1: "Howard-bound",
        5: "95th/Dan Ryan-bound",
      },
    },
    {
      label: "Blue",
      codes: ["blue"],
      color: "#00a1de",
      stations: [],
      dropdownOn: false,
      isFiltered: false,
      directions: {
        1: "O’Hare-bound",
        5: "Forest Park-bound",
      },
    },
    {
      label: "Brown",
      codes: ["brn"],
      color: "#62361b",
      stations: [],
      dropdownOn: false,
      isFiltered: false,
      directions: {
        1: "Kimball-bound",
        5: "Loop-bound",
      },
    },
    {
      label: "Green",
      codes: ["g"],
      color: "#009b3a",
      stations: [],
      dropdownOn: false,
      isFiltered: false,
      directions: {
        1: "Harlem/Lake-bound",
        5: "Ashland/63rd- or Cottage Grove-bound",
      },
    },
    {
      label: "Orange",
      codes: ["o"],
      color: "#f9461c",
      stations: [],
      dropdownOn: false,
      isFiltered: false,
      directions: {
        1: "Loop-bound",
        5: "Midway-bound",
      },
    },
    {
      label: "Pink",
      codes: ["pnk"],
      color: "#e27ea6",
      stations: [],
      dropdownOn: false,
      isFiltered: false,
      directions: {
        1: "Loop-bound",
        5: "54th/Cermak-bound",
      },
    },
    {
      label: "Purple",
      codes: ["p", "pexp"],
      color: "#522398",
      stations: [],
      dropdownOn: false,
      isFiltered: false,
      directions: {
        1: "Linden-bound",
        5: "Howard- or Loop-bound",
      },
    },
    {
      label: "Yellow",
      codes: ["y"],
      color: "#f9e300",
      stations: [],
      dropdownOn: false,
      isFiltered: false,
      directions: {
        1: "Skokie-bound",
        5: "Howard-bound",
      },
    },
  ]);

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const response = await axios.get(
          "https://data.cityofchicago.org/resource/8pix-ypme.json"
        );

        const stopData = response.data;

        // Create a copy of lines to update
        let updatedLines = lines.map((line) => ({
          ...line,
          stations: [], // Clear out stations initially
        }));

        stopData.forEach((stop) => {
          const mapId = stop.map_id;

          updatedLines = updatedLines.map((line) => {
            // Check if the current stop belongs to the current line
            if (line.codes.some((code) => stop[code])) {
              // Ensure the station (map_id) is unique within this line
              const stationExists = line.stations.some(
                (station) => station.map_id === mapId
              );

              if (!stationExists) {
                return {
                  ...line,
                  stations: [
                    ...line.stations,
                    {
                      map_id: mapId,
                      station_name: stop.station_name,
                      station_descriptive_name: stop.station_descriptive_name,
                      stops: [
                        { stop_id: stop.stop_id, stop_name: stop.stop_name }, // Add the first stop
                      ],
                      ada: stop.ada,
                      dropdownOn: false,
                    },
                  ],
                };
              } else {
                // Append the stop_id to the existing map_id station
                return {
                  ...line,
                  stations: line.stations.map((station) => {
                    if (station.map_id === mapId) {
                      // Add the stop_id to the stops array, if not already present
                      if (
                        !station.stops.some((s) => s.stop_id === stop.stop_id)
                      ) {
                        return {
                          ...station,
                          stops: [
                            ...station.stops,
                            {
                              stop_id: stop.stop_id,
                              stop_name: stop.stop_name,
                            },
                          ],
                        };
                      }
                    }
                    return station;
                  }),
                };
              }
            }
            return line;
          });
        });

        setLines(updatedLines); // Update lines with grouped stations
      } catch (error) {
        console.error("Error fetching train station data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStations();
  }, []);

  // Log stations and lines whenever they change
  // useEffect(() => {
  //   console.log("Updated Stations:", stations.slice(0, 1)); // Log first 5 stations
  // }, [stations]); // This will run whenever `stations` changes

  // useEffect(() => {
  //   console.log("Updated Lines:", lines.slice(0, 1)); // Log first 5 lines
  // }, [lines]); // This will run whenever `lines` changes

  const [stationPredictions, setStationPredictions] = useState([]);

  const fetchStopPredictions = async (stopId) => {
    try {
      console.log(`Fetching Station Predictions for stopId: ${stopId}`); // Log stopId being fetched

      const response = await axios.get(
        `https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx?key=${process.env.EXPO_PUBLIC_CTA_API_KEY}&stpid=${stopId}&outputType=JSON`
      );

      // console.log("Raw Response Data:", response.data); // Log the raw response data to inspect its structure

      const predictionsData = response.data.ctatt
        ? response.data.ctatt.eta
        : [];
      // console.log(`Predictions for stopId ${stopId}:`, predictionsData); // Log extracted predictions data

      setStationPredictions((prevStationPredictions) => {
        const updatedPredictions = {
          ...prevStationPredictions,
          [stopId]: predictionsData,
        };
        //   console.log("Updated Station Predictions State:", updatedPredictions); // Log the updated state
        return updatedPredictions;
      });
    } catch (error) {
      console.error(`Error fetching predictions for stopId ${stopId}:`, error); // Log any errors
    }
  };

  const toggleStopDropdown = (item) => {
    setLines((prevLines) =>
      prevLines.map((line) => {
        if (line.stations.some((station) => station.map_id === item.map_id)) {
          const updatedStations = line.stations.map((station) =>
            station.map_id === item.map_id
              ? {
                  ...station,
                  dropdownOn: !station.dropdownOn,
                }
              : station
          );
          // Trigger prediction fetch if dropdown is being opened
          if (!item.dropdownOn) {
            item.stops.forEach((stop) => fetchStopPredictions(stop.stop_id));
          }
          return { ...line, stations: updatedStations };
        }
        return line;
      })
    );
  };

  const toggleStationDropdown = (item) => {
    setStations((prevStations) =>
      prevStations.map((station) =>
        station.map_id === item.map_id
          ? {
              ...station,
              dropdownOn: !station.dropdownOn,
            }
          : station
      )
    );

    // Trigger prediction fetch if dropdown is being opened
    // if (!item.dropdownOn) {
    //   item.stops.forEach((stop) => fetchStopPredictions(stop.stop_id));
    // }
  };

  const handleSearch = (text) => {
    setSearch(text);
    // Reset all station dropdowns when searching
    setLines((prevLines) =>
      prevLines.map((line) => ({
        ...line,
        stations: line.stations.map((station) => ({
          ...station,
          dropdownOn: false,
        })),
      }))
    );
  };

  // Filter stations based on the search term
  const filterStations = (line) => {
    return line.stations.filter((stop) =>
      stop.station_name.toLowerCase().includes(search.toLowerCase())
    );
  };

  const extractConnections = (stopName) => {
    const regex = /\(([^)]+)\)/g;
    const matches = [...stopName.matchAll(regex)];
    return matches.map((match) => match[1]).join(", ");
  };

  const toggleDropdown = (lineLabel) => {
    setLines((prevLines) =>
      prevLines.map(
        (line) =>
          line.label === lineLabel
            ? { ...line, dropdownOn: !line.dropdownOn } // Toggle dropdownOn for the matching line
            : line // Keep other lines unchanged
      )
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading Stations...</Text>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Chicago Train Stations</Text>
            </View>
            <View style={styles.searchContainer}>
              <Ionicons
                name="search"
                size={20}
                color="#999"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchBar}
                placeholder="Search by Station Name"
                value={search}
                onChangeText={handleSearch}
                clearButtonMode="always"
                autoComplete=""
              />
            </View>

            <SectionList
              sections={
                search.length > 0
                  ? [
                      {
                        title: "Search Results",
                        data: lines
                          .filter((line) => !line.isFiltered)
                          .flatMap((line) => filterStations(line))
                          .sort((a, b) => a.map_id - b.map_id),
                        color: "#000", // Default color for search results
                        key: "searchResults", // Use a unique key for search results
                      },
                    ]
                  : lines // When not searching, show normal line-based sections
                      .filter((line) => !line.isFiltered)
                      .map((line) => ({
                        title: line.label,
                        data: line.dropdownOn ? filterStations(line) : [],
                        color: line.color,
                        stops: line.stations.length,
                        key: line.label, // Use the line label as a unique key
                      }))
              }
              keyExtractor={(item, index) => `${item.stop_id}-${index}`} // Use a unique key for each item
              renderSectionHeader={({ section }) =>
                search.length > 0 ? null : ( // Hide section headers during search
                  <TouchableOpacity
                    onPress={() => toggleDropdown(section.title)}
                    style={[
                      styles.sectionHeader,
                      { borderLeftColor: section.color },
                    ]}
                  >
                    <Text style={styles.lineTitle}>{section.title} Line</Text>
                    <Ionicons
                      name={
                        section.data.length > 0 ? "chevron-up" : "chevron-down"
                      }
                      size={24}
                      color="#666"
                    />
                  </TouchableOpacity>
                )
              }
              renderItem={({ item, section }) => (
                <TouchableOpacity onPress={() => toggleStopDropdown(item)}>
                  <View style={styles.stopCard}>
                    <View
                      style={[
                        styles.stopColorIndicator,
                        {
                          backgroundColor:
                            search.length > 0
                              ? lines.find((line) =>
                                  line.stations.some((station) =>
                                    station.stops.some(
                                      (stop) => stop.stop_id === item.stops[0].stop_id
                                    )
                                  )
                                )?.color || "#333" // Fallback color if line not found
                              : section.color, // Default color when not searching
                        },
                      ]}
                    />
                    <View style={styles.stopInfo}>
                      <View style={styles.stationTitleContainer}>
                        <Text style={styles.stopName}>{item.station_name}</Text>
                        {item.ada && (
                          <FontAwesome
                            name="wheelchair"
                            size={14}
                            color="black"
                          />
                        )}
                      </View>
                      <Text style={styles.stopSubText}>
                        Connections:{" "}
                        {extractConnections(item.station_descriptive_name)}
                      </Text>

                      {item.dropdownOn && (
                        <View style={styles.expandedContent}>
                          {item.stops.map((stop, stopIndex) => {
                            const predictions =
                              stationPredictions[stop.stop_id];

                            return (
                              <View
                                key={stopIndex}
                                style={
                                  stopIndex !== 0 ? { paddingTop: 10 } : {}
                                }
                              >
                                <Text style={styles.stopPredictionTitle}>
                                  {stop.stop_name}
                                </Text>

                                <View style={styles.predictionTableHeader}>
                                  <Text
                                    style={[
                                      styles.predictionText,
                                      styles.boldText,
                                    ]}
                                  >
                                    Run
                                  </Text>
                                  <Text
                                    style={[
                                      styles.predictionText,
                                      styles.boldText,
                                    ]}
                                  >
                                    Direction
                                  </Text>
                                  <Text
                                    style={[
                                      styles.predictionText,
                                      styles.boldText,
                                    ]}
                                  >
                                    ETA
                                  </Text>
                                </View>

                                {predictions ? (
                                  <View>
                                    {predictions.map((prediction, index) => {
                                      const arrivalTime = new Date(
                                        prediction.arrT
                                      );
                                      const currentTime = new Date();
                                      const timeDiff = Math.round(
                                        (arrivalTime - currentTime) / 60000
                                      );
                                      let etaTextStyle = styles.predictionText;
                                      if (prediction.isSch === "0") {
                                        etaTextStyle = [
                                          etaTextStyle,
                                          styles.boldText,
                                        ];
                                      }

                                      if (prediction.isDly === "1") {
                                        etaTextStyle = [
                                          etaTextStyle,
                                          { color: "red" },
                                        ];
                                      }

                                      if (
                                        prediction.isApp === "1" ||
                                        timeDiff <= 2
                                      ) {
                                        etaTextStyle = [
                                          etaTextStyle,
                                          { color: "green" },
                                        ];
                                      }

                                      return (
                                        <View
                                          key={index}
                                          style={styles.predictionRow}
                                        >
                                          <Text style={styles.predictionText}>
                                            {prediction.rn}
                                          </Text>
                                          <Text style={styles.predictionText}>
                                            {prediction.destNm}
                                          </Text>
                                          <Text style={etaTextStyle}>
                                            {prediction.isApp === "1" ||
                                            timeDiff <= 2
                                              ? "DUE"
                                              : `${timeDiff} min`}
                                          </Text>
                                        </View>
                                      );
                                    })}
                                  </View>
                                ) : (
                                  <Text
                                    style={[
                                      styles.predictionText,
                                      { padding: 10 },
                                    ]}
                                  >
                                    No predictions available.
                                  </Text>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  stationTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f4f4",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  suggestionsContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 16,
    maxHeight: 150,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  suggestionText: {
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lineTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  stopCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  stopColorIndicator: {
    width: 8,
    height: "100%",
    borderRadius: 4,
    marginRight: 12,
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  stopPredictionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  stopSubText: {
    fontSize: 14,
    color: "#666",
  },
  expandedContent: {
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
    marginTop: 5,
  },
  predictionTableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  predictionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  predictionText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
    textAlign: "center",
  },
  boldText: {
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: "#666",
  },
});

export default Trains;
