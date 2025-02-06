import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SectionList,
  SafeAreaView,
  StatusBar,
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";

function Trains() {
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [lines, setLines] = useState([
    {
      label: "Red",
      codes: ["red"],
      color: "#c60c30",
      stations: [],
      dropdownOn: false,
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
      directions: {
        1: "Harlem/Lake-bound",
        5: "Ashland/63rd- or Cottage Grove-bound",
      },
    },
    {
      label: "Orange",
      codes: ["o", "Org"],
      color: "#f9461c",
      stations: [],
      dropdownOn: false,
      directions: {
        1: "Loop-bound",
        5: "Midway-bound",
      },
    },
    {
      label: "Pink",
      codes: ["pnk", "Pink"],
      color: "#e27ea6",
      stations: [],
      dropdownOn: false,
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

        let updatedLines = lines.map((line) => ({
          ...line,
          stations: [],
        }));

        stopData.forEach((stop) => {
          const mapId = stop.map_id;

          updatedLines = updatedLines.map((line) => {
            if (line.codes.some((code) => stop[code])) {
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
                        {
                          stop_id: stop.stop_id,
                          stop_name: stop.stop_name,
                        },
                      ],
                      ada: stop.ada,
                      line_label: line.label,
                      line_codes: line.codes,
                      line_color: line.color,
                      dropdownOn: false,
                      lineLabel: line.label,    
                      lineColor: line.color,
                    },
                  ],
                };
              } else {
                return {
                  ...line,
                  stations: line.stations.map((station) => {
                    if (station.map_id === mapId) {
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

        setLines(updatedLines);
      } catch (error) {
        console.error("Error fetching train station data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStations();
  }, []);

  const [stationPredictions, setStationPredictions] = useState([]);

  const fetchStopPredictions = async (stopId) => {
    try {
      // console.log(`Fetching Station Predictions for stopId: ${stopId}`);

      const response = await axios.get(
        `https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx?key=${process.env.EXPO_PUBLIC_CTA_TRAIN_API_KEY}&stpid=${stopId}&outputType=JSON`
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
      console.error(`Error fetching predictions for stopId ${stopId}:`, error);
    }
  };

  const toggleStopDropdown = (item) => {
    //console.log(section.title)
    // console.log(item);
    setLines((prevLines) =>
      prevLines.map((line) => {
        if (
          line.stations.some((station) => station.map_id === item.map_id) &&
          line.label == item.lineLabel
        ) {
          // console.log("passed if");
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

  const handleSearch = (text) => {
    setSearch(text);
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
      prevLines.map((line) =>
        line.label === lineLabel
          ? { ...line, dropdownOn: !line.dropdownOn }
          : line
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
            

            {search.length > 0 && lines.flatMap((line) => filterStations(line)).length < 1 ? (
              <Text style={styles.noMatch}>No Matching Stations</Text>
            ) : (

              <SectionList
                sections={
                  search.length > 0
                    ? [
                        {
                          data: lines
                            .flatMap((line) => filterStations(line))
                            .sort((a, b) => a.map_id - b.map_id),
                          key: "searchResults",
                        },
                      ]
                    : lines.map((line) => ({
                        title: line.label,
                        data: line.dropdownOn ? filterStations(line) : [],
                        color: line.color,
                        stops: line.stations.length,
                        key: line.label,
                      }))
                }
                keyExtractor={(item, index) => `${item.stop_id}-${index}`}
                renderSectionHeader={({ section }) =>
                  search.length > 0 ? null : (
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
                              search.length > 0 ? item.line_color : section.color,
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
                              const rawPredictions =
                                stationPredictions[stop.stop_id] || [];

                              const lineCodesToCompare = item.line_codes.map(
                                (code) => code.toLowerCase()
                              );

                              const predictions = rawPredictions.filter(
                                (prediction) => {
                                  return lineCodesToCompare.includes(
                                    prediction.rt.toLowerCase()
                                  );
                                }
                              );

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

                                  {predictions.length > 0 ? (
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
            )}
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
  noMatch: {
    textAlign: "center",
    fontSize: 16,
    padding: 15,
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
