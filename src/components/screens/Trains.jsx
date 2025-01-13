import React, { useState } from "react";
import { ScrollView, Text, TextInput, View, StyleSheet } from "react-native";

function Trains() {
    const [query, setQuery] = useState("");

    return (
        <View style={styles.container}>
            <Text>Station</Text>
            <TextInput
                style={styles.searchBar}
                placeholder="Search Stations..."
                value={query}
                onChangeText={(text) => setQuery(text)}
            />
            <ScrollView>
                <Text>Results...</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
    },
    searchBar: {
        height: 40,
        borderColor: "#ccc",
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        marginBottom: 10,
    },
});

export default Trains;
