## Abstract

In the practical part of the workshop, with the help of companion software developed for the lesson by D. Fusi and published [on his website](https://summer-lod.fusi-soft.com), attendants enrich a TEI XML file of a letter by Veronica Franco by including references to LOD entities representing people and places, a typical real-world application scenario for LOD technologies. Course attendants find out LOD URIs for entities such as *Enrico III* (Henry III) and *Francia* (France) on DBPedia and mark their names in Veronica Franco's text with the relevant TEI markup, pointing to those URIs. Then they use the companion software to generate its HTML visualization, to pull data about those entities from the Semantic Web (namely, from DBPedia) and to visualize that data.


## Resources

- Tools online
    - [Companion software on D. Fusi's website](https://summer-lod.fusi-soft.com)
    - [Recogito NER](https://recogito.pelagios.org)
- Some LOD resources
    - <https://www.dbpedia.org/>
    - <https://www.wikidata.org/>
    - <https://lod-cloud.net/>




## Exercise

### Files to download

Use the top-right 'download raw file' button ![download button](https://raw.githubusercontent.com/SunoikisisDC/SunoikisisDC-2025-2026/main/data/Summer-2026-Session-4/button_images/gitbhub-download-detail.png) to download the files:

1. ['Incomplete' version](https://github.com/SunoikisisDC/SunoikisisDC-2025-2026/blob/main/data/Summer-2026-Session-4/XML/aen_incomplete.xml) of the TEI XML file
2. ['Complete' version](https://github.com/SunoikisisDC/SunoikisisDC-2025-2026/blob/main/data/Summer-2026-Session-4/XML/aen_complete.xml)



### Step 1

#### What you are doing

You start from a TEI XML file of the *incipit* of the *Aeneid*, in which Troy, Italy, the shores of Lavinium and Juno (person) are mentioned, but in which the semantic markup regarding places and people is incomplete. In step 1 we simply download and inspect this file.


#### Why you are doing it

This is the base file that you will connect with LOD entities in the next steps. The scenario we are mimicking is a very common one: imagine that, in your research project, you have a TEI-encoded text that you want to enrich with semantic markup.

#### How to do it

1. Download the ['incomplete' version](https://github.com/SunoikisisDC/SunoikisisDC-2025-2026/blob/main/data/Summer-2026-Session-4/XML/aen_incomplete.xml) of the TEI XML file
    - Use the top-right 'download raw file' button ![download button](https://raw.githubusercontent.com/SunoikisisDC/SunoikisisDC-2025-2026/main/data/Summer-2026-Session-4/button_images/gitbhub-download-detail.png)
2. Save the file in a folder of your computer where you will be able to find it later
3. Open it with your XML editor to check if the download worked
4. Keep it open in your XML editor, for the next step

### What to do if anything goes wrong

No problem: the website already has a working TEI XML file, so you don't really have to upload your one.











### Step 2

#### What you are doing

You find out the LOD URIs for:

Entity   | Latin      | Type   | Required URI | Optional URIs
---      | ---        | ---    | ---          | ---
Juno     | *Iuno*     | person | DBPedia      | Wikidata, VIAF, Katalog der Deutschen Nationalbibliothek (D-NB)
Troy     | *Troia*    | place  | DBPedia      | VIAF
Lavinium | *Lavinium* | place  | DBPedia      | VIAF
Italy    | *Italia*   | place  | DBPedia      | VIAF



#### Why you are doing it

So, in the next steps, you can replace the "§" placeholders with the relevant URIs in the TEI XML file (thus linking our 'internal' semantic markup to the Semantic Web).


#### How to do it (3 approaches)
 
##### 1. DBPedia lookup (recommended for this exercise)

1. Use the search function in <https://lookup.dbpedia.org/>
    - You will see that DBPedia URIs look like `http://dbpedia.org/resource/Troy`

##### 2. DBPedia 'geek' approach (SPARQL query)

1. Go to <https://dbpedia.org/sparql>
2. Paste a SPARQL query like this, after replacing `Troy` with the 'label' you are searching, and hit 'Execute Query':

```sparql
SELECT ?uri ?label
WHERE {
?uri rdfs:label ?label .
filter(?label="Troy"@en)
}
```

##### 3. 'Production' approach: Recogito

1. Use a NER (Named Entity Recognition) tool such as [Recogito](https://recogito.pelagios.org)
2. Register by creating a free account, then login
3. Upload your TEI XML document: click on 'New' (top left) ![new](https://raw.githubusercontent.com/SunoikisisDC/SunoikisisDC-2025-2026/main/data/Summer-2026-Session-4/button_images/recogito1.jpg)
4. Double click on the file in the list to open it
5. Click on highlighted words/phrases to review/edit the semantic markup
    - ...Recogito fails to recognize our entities. Why?
6. Click on the 'Search' button and search for a lemmatized/normalized form of the name (e.g.: *Troiae* → *Troia* or *Troy*; *Laviniaque* → *Lavinium*)
7. Once finished, click on the 'Download' button on the top horizontal menu and choose 'TEI/XML' as format (last row, 'Annotated document / TEI / TEI/XML')
8. Open the downloaded TEI file with your XML editor: is the `ref` markup strategy the same of our TEI file?

*Note*: We won't be using the TEI file you downloaded from Recogito for the rest of this exercise, because it is encoded differently. We will continue using our `aen_incomplete.xml` file.


#### What to do if anything goes wrong

Find the relevant URIs in the *How to do it* section of the next step and skip to it.










### Step 3

#### What you are doing

Add the relevant URIs to your TEI markup (`<place>` and `<person>` elements).


#### Why you are doing it

So the semantic markup of your TEI XML file is actually linked to the Semantic Web.

#### How to do it

1. Find the `§020 Insert persons` and the `§030 Insert places` bookmarks in the 'incomplete' TEI XML file (`aen_incomplete.xml`)
2. Replace the "§" placeholders (e. g the "§" in `<idno type="dbpedia">§</idno>`) with the relevant LOD URIs, i.e.:

Entity   | URI      | URI
---      | ---      | ---
Iuno     | DBPedia  | <http://dbpedia.org/resource/Juno_(mythology)>
Iuno     | Wikidata | <http://www.wikidata.org/entity/Q125046>
Iuno     | VIAF     | <http://viaf.org/viaf/47558229>
Iuno     | D-NB     | <http://d-nb.info/gnd/118800574>
Troia    | DBPedia  | <http://dbpedia.org/resource/Troy>
Troia    | VIAF     | <http://viaf.org/viaf/241435491>
Lavinium | DBPedia  | <http://dbpedia.org/resource/Lavinium>
Lavinium | VIAF     | <http://viaf.org/viaf/243024149>
Italia   | DBPedia  | <http://dbpedia.org/resource/Italy>
Italia   | VIAF     | <http://viaf.org/viaf/152361066>

*Note*: DBPedia URIs should start with `http`, not with `https`, and include `resource`, not `page`. For example, <http://dbpedia.org/resource/Italy> is OK, but <https://dbpedia.org/page/Italy> is not.



#### What to do if anything goes wrong

- Download the ['complete' version](https://github.com/SunoikisisDC/SunoikisisDC-2025-2026/blob/main/data/Summer-2026-Session-4/XML/aen_complete.xml) of the TEI XML file, in which all URIs have been included, so you are ready for the next steps
    - Use the top-right 'download raw file' button ![download button](https://raw.githubusercontent.com/SunoikisisDC/SunoikisisDC-2025-2026/main/data/Summer-2026-Session-4/button_images/gitbhub-download-detail.png)
    - Please note in which folder you are downloading this file. You can replace the previous version and resume work from the 'complete' file for the next steps





### Step 4

#### What you are doing

Connect the `<personName>` and the `<placeName>` elements in the TEI `<text>` to the `<place>` and `<person>` elements in the TEI `<teiHeader>`.


#### Why you are doing it

Because this is the TEI Guidelines strategy: the `<text>` points to the to `<teiHeader>`, and the latter inlcudes the LOD URIs.

#### How to do it

1. Find the `§040` bookmark in the 'incomplete' TEI XML file (`aen_incomplete.xml`)
2. Replace the "§" placeholders (e. g the "§" in `<placeName ref="§">Troiae</placeName`) with pointers to the `xml:id` of the relevant `<person>` or `<place>` in the `<teiHeader>` (e.g. `pl_troia` for Troy). Remember that in XML pointers start with `#`, so the result for Troy should look like `<placeName ref="#pl_troia">Troiae</placeName>`.



#### What to do if anything goes wrong

- Download the ['complete' version](https://github.com/SunoikisisDC/SunoikisisDC-2025-2026/blob/main/data/Summer-2026-Session-4/XML/aen_complete.xml) of the TEI XML file, in which all TEI markup has been completed, so you are ready for the next steps
    - Use the top-right 'download raw file' button ![download button](https://raw.githubusercontent.com/SunoikisisDC/SunoikisisDC-2025-2026/main/data/Summer-2026-Session-4/button_images/gitbhub-download-detail.png)
    - Please note in which folder you are downloading this file. You can replace the previous version and resume work from the 'complete' file for the next steps










### Step 5

#### What you are doing

You upload the updated TEI XML file to the website <https://summer-lod.fusi-soft.com>, which includes software that will process it.



#### Why you are doing it

The [website](https://summer-lod.fusi-soft.com/) already includes a default version of our TEI XML file, but you may provide it with your own version (thus mimicking a real-world workflow).

#### How to do it

1. Make sure that you have a working, valid and complete TEI XML file
2. If you're not sure, or if anything is wrong or missing in your TEI XML file, download the ['complete' version](https://github.com/SunoikisisDC/SunoikisisDC-2025-2026/blob/main/data/Summer-2026-Session-4/XML/aen_complete.xml)
3. Visit the website <https://summer-lod.fusi-soft.com> and locate the button bar, just behind the XML and XSLT code windows: ![button bar](https://raw.githubusercontent.com/SunoikisisDC/SunoikisisDC-2025-2026/main/data/Summer-2026-Session-4/button_images/button-all.jpg)
4. Upload the updated TEI XML file by clicking on the *Load XML from file* button: ![load from XML button](https://raw.githubusercontent.com/SunoikisisDC/SunoikisisDC-2025-2026/main/data/Summer-2026-Session-4/button_images/button-upload-xml.jpg)


#### What to do if anything goes wrong

Not much: you need this starting file for the next steps.





### Step 6

#### What you are doing

You generate the HTML visualization based on your updated XML, and the XSLT.

#### Why you are doing it

To see the typical XML → XSLT → HTML pipeline in action.

#### How to do it

1. Click on the *Transform XML with XSLT* button: ![transform XML with XSLT](https://raw.githubusercontent.com/SunoikisisDC/SunoikisisDC-2025-2026/main/data/Summer-2026-Session-4/button_images/button-transform.jpg)
2. Check the visualization that appears in the *HTML* box of the [website](https://summer-lod.fusi-soft.com/), behind the source code and the ![button bar](https://raw.githubusercontent.com/SunoikisisDC/SunoikisisDC-2025-2026/main/data/Summer-2026-Session-4/button_images/button-all.jpg)

#### What to do if anything goes wrong

This step is not directly relevant to LOD: if things don't go your way, just skip to the next step.






### Step 7

#### What you are doing

You run the "Parse XML entities" function of the [website](https://summer-lod.fusi-soft.com/), which pulls data about our entities from the Semantic Web (namely, from DBPedia: this is why in our exercise only the DBPedia URI was mandatory, while other URIs were optional).

#### Why you are doing it

So you can see the power of LOD in action!

#### How to do it

1. Click on the *Parse XML entities* button ![parse XML entities](https://raw.githubusercontent.com/SunoikisisDC/SunoikisisDC-2025-2026/main/data/Summer-2026-Session-4/button_images/button-parse.jpg)
2. Check the entities list in the new window that has appeared just above the map
3. Click on the *View details* button ![view details](https://raw.githubusercontent.com/SunoikisisDC/SunoikisisDC-2025-2026/main/data/Summer-2026-Session-4/button_images/button-info.jpg) for each entity and check the *Details* window that appears. Where does this information come from? Is it encoded in the TEI XML file?
4. Switch the language of the abstract in the dropdown menu
5. Click on the *Fly to this location* button ![fly to this location](https://raw.githubusercontent.com/SunoikisisDC/SunoikisisDC-2025-2026/main/data/Summer-2026-Session-4/button_images/button-fly.jpg) in the Lavinium row (or in any other row of a place) and check the map. Where does the geographical information (latitude, longitude) come from? Is it encoded in the TEI XML file?
6. Does the system show any geographical information for people (Juno)? Why?

#### What to do if anything goes wrong

Not much, but please drop us a line to let us know that the LOD parsing didn't work for you.
