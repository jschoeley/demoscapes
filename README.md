# <img src="website/assets/logo.svg" align="right" height="300" />demoscapes.org

Jonas Schöley [![ORCID](https://info.orcid.org/wp-content/uploads/2019/11/orcid_16x16.png)](https://orcid.org/0000-0002-3340-8518) 
[jschoeley.com](https://www.jschoeley.com/)

[Demoscapes.org](https://demoscapes.org) is a web application for visualizing demographic data as heat maps (so called "Lexis surfaces").

For an introduction to Lexis surfaces and their use in demography see [Minton (2014)], [Scholey & Willekens (2017)], [Rau et al. (2018)], and [Pattaro et al. (2020)].

[Minton (2014)]: https://doi.org/10.1016/j.sste.2014.04.003
[Schoeley & Willekens (2017)]: https://www.demographic-research.org/articles/volume/36/21/
[Rau et al. (2018)]: https://doi.org/10.1007/978-3-319-64820-0
[Pattaro et al. (2020)]: http://www.demographic-research.org/Volumes/Vol42/23/

## Local build

To build the app locally, first copy the example environment file and set the required values:

```bash
cp .env.example .env
```

Then build the Docker images:

```bash
make build
```

To start the full local stack after the build completes, run:

```bash
make smoke-website
```

