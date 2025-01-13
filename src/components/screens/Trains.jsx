import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
} from "react-native";
import axios from "axios";

function Trains() {
    const [stations, setStations] = useState({});
    const [filteredStations, setFilteredStations] = useState({});
    const [search, setSearch] = useState("");
    const [dropdownStates, setDropdownStates] = useState({});
    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        const fetchStations = async () => {
            try {
                const response = await axios.get(
                    "https://data.cityofchicago.org/resource/8pix-ypme.json"
                );

                // Organize stations by line color
                const groupedByLines = response.data.reduce((acc, station) => {
                    const lines = [];

                    if (station.red === true) lines.push("Red");
                    if (station.blue === true) lines.push("Blue");
                    if (station.g === true) lines.push("Green");
                    if (station.brn === true) lines.push("Brown");
                    if (station.pexp === true) lines.push("Purple (Express)");
                    if (station.p === true) lines.push("Purple");
                    if (station.pnk === true) lines.push("Pink");
                    if (station.y === true) lines.push("Yellow");
                    if (station.orange === true) lines.push("Orange");

                    lines.forEach((line) => {
                        if (!acc[line]) acc[line] = [];
                        acc[line].push(station);
                    });

                    return acc;
                }, {});

                setStations(groupedByLines);
                setFilteredStations(groupedByLines);

                // Initialize dropdown states (default open)
                setDropdownStates(
                    Object.keys(groupedByLines).reduce((acc, line) => {
                        acc[line] = true;
                        return acc;
                    }, {})
                );
            } catch (error) {
                console.error("Error fetching train station data:", error);
            }
        };

        fetchStations();
    }, []);

    const handleSearch = (text) => {
        setSearch(text);

        // Generate suggestions for autofill
        const allStops = Object.values(stations).flat();
        const matchedSuggestions = allStops
            .filter((stop) =>
                stop.station_name.toLowerCase().includes(text.toLowerCase())
            )
            .map((stop) => stop.station_name);
        setSuggestions([...new Set(matchedSuggestions)]);

        // Filter stations by search query
        const filtered = Object.entries(stations).reduce((acc, [line, stops]) => {
            const filteredStops = stops.filter((stop) =>
                stop.station_name.toLowerCase().includes(text.toLowerCase())
            );
            if (filteredStops.length > 0) acc[line] = filteredStops;
            return acc;
        }, {});

        setFilteredStations(filtered);
    };

    const handleSuggestionClick = (suggestion) => {
        setSearch(suggestion);
        handleSearch(suggestion);
        setSuggestions([]);
    };

    const toggleDropdown = (line) => {
        setDropdownStates((prevState) => ({
            ...prevState,
            [line]: !prevState[line],
        }));
    };

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.searchBar}
                placeholder="Search by Station Name"
                value={search}
                onChangeText={handleSearch}
            />
            {suggestions.length > 0 && (
                <ScrollView style={styles.suggestionsContainer}>
                    {suggestions.map((suggestion, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => handleSuggestionClick(suggestion)}
                        >
                            <Text style={styles.suggestionText}>{suggestion}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
            <ScrollView>
                {Object.entries(filteredStations).map(([line, stops]) => (
                    <View key={line} style={styles.lineSection}>
                        <TouchableOpacity onPress={() => toggleDropdown(line)}>
                            <Text style={[styles.lineTitle, { color: line.toLowerCase() }]}>
                                {line} Line ({stops.length} stops)
                            </Text>
                        </TouchableOpacity>
                        {dropdownStates[line] &&
                            stops.map((stop) => (
                                <View key={stop.stop_id} style={styles.stopCard}>
                                    <Text style={styles.stopName}>{stop.station_name}</Text>
                                    <Text style={styles.stopId}>Stop ID: {stop.stop_id}</Text>
                                </View>
                            ))}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "#f4f4f4",
    },
    searchBar: {
        height: 40,
        borderColor: "#ccc",
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 16,
    },
    suggestionsContainer: {
        backgroundColor: "#fff",
        borderRadius: 8,
        marginBottom: 16,
        maxHeight: 150,
    },
    suggestionText: {
        padding: 10,
        fontSize: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    lineSection: {
        marginBottom: 16,
        backgroundColor: "#fff",
        borderRadius: 8,
        padding: 8,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
    },
    lineTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 8,
    },
    stopCard: {
        marginVertical: 4,
        padding: 8,
        backgroundColor: "#f9f9f9",
        borderRadius: 6,
    },
    stopName: {
        fontSize: 16,
        fontWeight: "bold",
    },
    stopId: {
        fontSize: 14,
        color: "#666",
    },
});

export default Trains;
